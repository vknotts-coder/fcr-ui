// Sortable table for the Salesforce-style List Views surface. SERVER component — sorting is driven by the
// URL (?sort=<col>&dir=asc|desc): each column header is a <Link> that re-requests the page, which re-runs
// the report with the new ORDER BY server-side. No client JS, no client re-sort — the row cap and RBAC
// scope are always honored because every render is a fresh scoped query. Styling mirrors the report
// builder's TabularGrid (report-results.tsx).

import Link from "next/link";
import type { CellValue, ReportColumn, TabularResult } from "@fcr/core/reports";
import type { ReportSort } from "@fcr/core/reports/definition";
import { renderCell, cellTd as td, cellTdNum as tdNum, defaultFormatters, type CellFormatters, type DateStyle } from "../cells.js";
import { sortQuery } from "./sort-href.js";
import { EditableCell, type EditInput, type EditCommit } from "./editable-cell.js";

export type { EditInput, EditCommit } from "./editable-cell.js";

/** Opt-in inline editing for a list grid. When provided, a cell whose column `specFor` returns a non-null
 *  input spec (and whose row resolves to a record id) renders as an editable cell wired to `onCommit`. Omit
 *  the prop for the default read-only grid. The consumer owns all policy: which columns are editable, the
 *  gated commit action, and how a row maps to its record id. The first (record-link) column stays a
 *  navigation link and is never made editable. */
export type EditableConfig = {
  specFor: (col: ReportColumn) => EditInput | null;
  onCommit: EditCommit;
  /** Maps a row to its STABLE, UNIQUE record id — used both as the React key for the <tr> and as the commit
   *  target for an editable cell. It MUST be (a) unique across the whole result set and (b) stable for a
   *  given record across a re-sort/re-query: derive it from the record's own id, never from sort position or
   *  a non-unique column. A duplicate or position-derived id makes React reuse rows by slot and silently
   *  reintroduces the frozen-editable-cell bug this grid's stable keying fixes. Return null only for a row
   *  that is never editable (its key then falls back to href, then index). */
  rowId: (row: Record<string, CellValue>, href: string | null) => string | null;
};

const thBase = "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-fcr-steel border-b border-fcr-line whitespace-nowrap";

/** Header cell: a link that sorts by this column. Clicking the already-active column flips direction;
 *  a new column starts ascending. Carries aria-sort for assistive tech. The sort href preserves `status`
 *  (the dropdown selection) AND every entry in `baseParams` — the consumer's other querystring params
 *  (a selected list view, an account/team filter, a search term) — so sorting doesn't reset them.
 *  `baseParams` is set first, then `status`/`sort`/`dir` win on any key collision. Empty/undefined values
 *  are skipped. A consumer whose page state is entirely in the path (e.g. `/list/[object]/[view]`) passes
 *  nothing and gets the prior behavior. */
export function SortableHeader({ col, sort, status, baseParams }: { col: ReportColumn; sort: ReportSort; status?: string | null; baseParams?: Record<string, string | undefined> }) {
  const active = sort.field === col.key;
  const nextDir = active && sort.dir === "asc" ? "desc" : "asc";
  const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  const caret = active ? (sort.dir === "asc" ? "▲" : "▼") : "";
  return (
    <th className={thBase} scope="col" aria-sort={ariaSort} style={{ textAlign: col.numeric ? "right" : "left" }}>
      <Link
        href={`?${sortQuery(col.key, nextDir, status, baseParams)}`}
        className={`inline-flex items-center gap-1 hover:text-fcr-red ${active ? "text-fcr-red" : ""}`}
        scroll={false}
      >
        {col.label}
        <span aria-hidden className="text-[8px]">{caret}</span>
      </Link>
    </th>
  );
}

export default function ListGrid({
  result,
  sort,
  status,
  baseParams,
  fmt = defaultFormatters,
  dateFormat = "iso",
  editable,
}: {
  result: TabularResult;
  sort: ReportSort;
  status?: string | null;
  /** Extra querystring params to preserve on every column-sort link (a selected view, account/team filter,
   *  search term). See SortableHeader. Omit when all page state lives in the route path. */
  baseParams?: Record<string, string | undefined>;
  fmt?: CellFormatters;
  /** How date cells render: `"iso"` (YYYY-MM-DD, default) or `"us"` (MM/DD/YY). Serializable, so a server
   *  page can set it (unlike `fmt`). Also threaded into editable date cells so an edited date reads the same. */
  dateFormat?: DateStyle;
  /** Opt-in inline editing. Omit for the default read-only grid. See EditableConfig. */
  editable?: EditableConfig;
}) {
  if (result.rows.length === 0) {
    return <p className="py-10 text-center text-sm text-fcr-steel">No records match this view.</p>;
  }
  // Dev-only guard: a duplicate row key makes React reuse rows by slot and silently resurrects the
  // frozen-editable-cell bug. Collect keys as we render and warn (never in prod) if editable.rowId
  // isn't unique across the result set.
  const seenRowKeys = process.env.NODE_ENV !== "production" && editable ? new Set<string>() : null;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            {result.columns.map((c) => (
              <SortableHeader key={c.key} col={c} sort={sort} status={status} baseParams={baseParams} />
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => {
            const href = result.hrefs[i];
            // STABLE row id — computed ONCE per row and used for BOTH the <tr> key and the editable cell's
            // commit target, so React's row identity and the cell's write target can never diverge.
            // Never the array index: sorting/filtering re-requests the page and returns rows in a new order;
            // an index key makes React reuse the <tr> (and its stateful EditableCell children) at each
            // POSITION, so an editable cell keeps the prior row's value and the column appears frozen while
            // read-only columns move (fcr-trailers #88, go-live revert 2026-11-03). A stable id makes React
            // MOVE the row + its cells to the new position. Falls back to href, then index, for a row with
            // no id (which is never editable — see EditableConfig.rowId).
            const rid = editable?.rowId(row, href ?? null) ?? null;
            const rowKey = rid ?? href ?? `row-${i}`;
            if (seenRowKeys) {
              if (seenRowKeys.has(rowKey)) {
                // eslint-disable-next-line no-console
                console.warn(
                  `[ListGrid] duplicate row key "${rowKey}" — editable cells can freeze on sort; editable.rowId must return a unique, stable id per row.`,
                );
              }
              seenRowKeys.add(rowKey);
            }
            return (
              <tr key={rowKey} className="hover:bg-fcr-paper/60">
                {result.columns.map((c, ci) => {
                  const text = renderCell(row[c.key] ?? null, c, fmt, dateFormat);
                  const linked = ci === 0 && href && text !== "—";
                  // The first (record-link) column stays navigable; every other column may be editable.
                  const spec = !linked ? editable?.specFor(c) ?? null : null;
                  // Reuse the row-level `rid` (one rowId() call per row) as the cell's commit target.
                  if (spec && rid) {
                    const v = row[c.key];
                    return (
                      <EditableCell
                        key={c.key}
                        rowId={rid}
                        col={c}
                        spec={spec}
                        initialRaw={v == null ? "" : String(v)}
                        onCommit={editable!.onCommit}
                        dateFormat={dateFormat}
                      />
                    );
                  }
                  return (
                    <td key={c.key} className={c.numeric ? tdNum : td}>
                      {linked ? (
                        <Link href={href} className="text-fcr-red hover:underline font-medium">
                          {text}
                        </Link>
                      ) : (
                        text
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
