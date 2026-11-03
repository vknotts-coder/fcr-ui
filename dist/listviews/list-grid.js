import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Sortable table for the Salesforce-style List Views surface. SERVER component — sorting is driven by the
// URL (?sort=<col>&dir=asc|desc): each column header is a <Link> that re-requests the page, which re-runs
// the report with the new ORDER BY server-side. No client JS, no client re-sort — the row cap and RBAC
// scope are always honored because every render is a fresh scoped query. Styling mirrors the report
// builder's TabularGrid (report-results.tsx).
import Link from "next/link";
import { renderCell, cellTd as td, cellTdNum as tdNum, defaultFormatters } from "../cells.js";
import { sortQuery } from "./sort-href.js";
import { EditableCell } from "./editable-cell.js";
const thBase = "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-fcr-steel border-b border-fcr-line whitespace-nowrap";
/** Header cell: a link that sorts by this column. Clicking the already-active column flips direction;
 *  a new column starts ascending. Carries aria-sort for assistive tech. The sort href preserves `status`
 *  (the dropdown selection) AND every entry in `baseParams` — the consumer's other querystring params
 *  (a selected list view, an account/team filter, a search term) — so sorting doesn't reset them.
 *  `baseParams` is set first, then `status`/`sort`/`dir` win on any key collision. Empty/undefined values
 *  are skipped. A consumer whose page state is entirely in the path (e.g. `/list/[object]/[view]`) passes
 *  nothing and gets the prior behavior. */
export function SortableHeader({ col, sort, status, baseParams }) {
    const active = sort.field === col.key;
    const nextDir = active && sort.dir === "asc" ? "desc" : "asc";
    const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
    const caret = active ? (sort.dir === "asc" ? "▲" : "▼") : "";
    return (_jsx("th", { className: thBase, scope: "col", "aria-sort": ariaSort, style: { textAlign: col.numeric ? "right" : "left" }, children: _jsxs(Link, { href: `?${sortQuery(col.key, nextDir, status, baseParams)}`, className: `inline-flex items-center gap-1 hover:text-fcr-red ${active ? "text-fcr-red" : ""}`, scroll: false, children: [col.label, _jsx("span", { "aria-hidden": true, className: "text-[8px]", children: caret })] }) }));
}
export default function ListGrid({ result, sort, status, baseParams, fmt = defaultFormatters, dateFormat = "iso", editable, }) {
    if (result.rows.length === 0) {
        return _jsx("p", { className: "py-10 text-center text-sm text-fcr-steel", children: "No records match this view." });
    }
    // Dev-only guard: a duplicate row key makes React reuse rows by slot and silently resurrects the
    // frozen-editable-cell bug. Collect keys as we render and warn (never in prod) if editable.rowId
    // isn't unique across the result set.
    const seenRowKeys = process.env.NODE_ENV !== "production" && editable ? new Set() : null;
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full border-collapse", children: [_jsx("thead", { children: _jsx("tr", { children: result.columns.map((c) => (_jsx(SortableHeader, { col: c, sort: sort, status: status, baseParams: baseParams }, c.key))) }) }), _jsx("tbody", { children: result.rows.map((row, i) => {
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
                                console.warn(`[ListGrid] duplicate row key "${rowKey}" — editable cells can freeze on sort; editable.rowId must return a unique, stable id per row.`);
                            }
                            seenRowKeys.add(rowKey);
                        }
                        return (_jsx("tr", { className: "hover:bg-fcr-paper/60", children: result.columns.map((c, ci) => {
                                const text = renderCell(row[c.key] ?? null, c, fmt, dateFormat);
                                const linked = ci === 0 && href && text !== "—";
                                // The first (record-link) column stays navigable; every other column may be editable.
                                const spec = !linked ? editable?.specFor(c) ?? null : null;
                                // Reuse the row-level `rid` (one rowId() call per row) as the cell's commit target.
                                if (spec && rid) {
                                    const v = row[c.key];
                                    return (_jsx(EditableCell, { rowId: rid, col: c, spec: spec, initialRaw: v == null ? "" : String(v), onCommit: editable.onCommit, dateFormat: dateFormat }, c.key));
                                }
                                return (_jsx("td", { className: c.numeric ? tdNum : td, children: linked ? (_jsx(Link, { href: href, className: "text-fcr-red hover:underline font-medium", children: text })) : (text) }, c.key));
                            }) }, rowKey));
                    }) })] }) }));
}
