"use client";

// Presentational results renderer for the report builder. Pure — depends only on the RunOutcome shape from
// the @fcr/core reports engine (imported as TYPES; no server code reaches the client bundle) and the
// INJECTED formatters. Shared by the builder preview and the saved-report page. Tabular vs grouped-summary
// with a grand-total foot row; a truncation banner when the run hit REPORT_ROW_CAP; record links on the
// identifying cell when the object exposes one (trucks today; trailers have no record route so hrefs are
// null and nothing links).

import Link from "next/link";
import type { ReportColumn, RunOutcome, SummaryResult, TabularResult, SummaryCell } from "@fcr/core/reports";
import { REPORT_ROW_CAP } from "@fcr/core/reports/definition";
import { renderCell, cellTd, cellTdNum, defaultFormatters, type CellFormatters } from "../cells.js";

// ── Cell formatting ────────────────────────────────────────────────────────────────────────────────

function renderSummaryCell(value: SummaryCell, col: ReportColumn, fmt: CellFormatters): string {
  if (value === null || value === undefined) return "—";
  return col.type === "money" ? fmt.money(value) : fmt.number(value);
}

// ── Sub-grids ──────────────────────────────────────────────────────────────────────────────────────

// Explicit variant constants (not derived from each other via String.replace — a later class rename would
// silently produce the wrong variant with no error).
const th = "text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-fcr-steel border-b border-fcr-line whitespace-nowrap";
const thNum = "text-right px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-fcr-steel border-b border-fcr-line whitespace-nowrap";
// Body-cell classes shared with the list-view grid (../cells) so the two can't drift.
const td = cellTd;
const tdNum = cellTdNum;

function TabularGrid({ result, fmt }: { result: TabularResult; fmt: CellFormatters }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            {result.columns.map((c) => (
              <th key={c.key} className={c.numeric ? thNum : th} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => {
            const href = result.hrefs[i];
            return (
              <tr key={i} className="hover:bg-fcr-paper/60">
                {result.columns.map((c, ci) => {
                  const text = renderCell(row[c.key] ?? null, c, fmt);
                  // First column links to the record when an href exists and the cell isn't blank.
                  const linked = ci === 0 && href && text !== "—";
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

function SummaryGrid({ result, fmt }: { result: SummaryResult; fmt: CellFormatters }) {
  const groupLabel = result.group.bucket
    ? `${result.group.label} (${result.group.bucket})`
    : result.group.label || "Group";
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className={th} scope="col">
              {groupLabel}
            </th>
            {result.columns.map((c) => (
              <th key={c.key} className={thNum} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r, i) => (
            <tr key={i} className="hover:bg-fcr-paper/60">
              <td className={td}>{r.groupValue}</td>
              {result.columns.map((c) => (
                <td key={c.key} className={tdNum}>
                  {renderSummaryCell(r.values[c.key] ?? null, c, fmt)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className={`${td} font-bold`}>Total</td>
            {result.columns.map((c) => (
              <td key={c.key} className={`${tdNum} font-bold`}>
                {renderSummaryCell(result.total[c.key] ?? null, c, fmt)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Banners + count line ─────────────────────────────────────────────────────────────────────────

function TruncationBanner({ result }: { result: TabularResult | SummaryResult }) {
  if (!result.truncated) return null;
  const msg =
    result.mode === "summary"
      ? `Totals cover only the first ${REPORT_ROW_CAP.toLocaleString()} matching rows and are NOT complete. Add filters to bring the report under the cap for exact totals.`
      : `Showing the first ${REPORT_ROW_CAP.toLocaleString()} rows — more rows match. Add filters to narrow the report.`;
  return (
    <div className="mb-3 rounded border border-fcr-amber bg-fcr-amber/10 px-3 py-2 text-sm text-fcr-ink">
      ⚠ {msg}
    </div>
  );
}

function CountLine({ result }: { result: TabularResult | SummaryResult }) {
  const text =
    result.mode === "summary"
      ? `${result.rowCount ?? 0} group${result.rowCount === 1 ? "" : "s"}${result.truncated ? "" : " · exact"}`
      : `${result.rowCount} row${result.rowCount === 1 ? "" : "s"}`;
  return <p className="mb-2 text-xs uppercase tracking-widest font-bold text-fcr-steel">{text}</p>;
}

// ── Public component ───────────────────────────────────────────────────────────────────────────────

export default function ReportResults({ outcome, fmt = defaultFormatters }: { outcome: RunOutcome; fmt?: CellFormatters }) {
  if (!outcome.ok) {
    return (
      <div className="rounded-lg border-2 border-fcr-red bg-fcr-red/5 p-4">
        <p className="text-sm font-bold uppercase tracking-widest text-fcr-red mb-1">Report error</p>
        <ul className="list-disc pl-5 text-sm text-fcr-ink">
          {outcome.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }

  const { result } = outcome;
  const empty = result.rows.length === 0;

  return (
    <div className="rounded-lg border-2 border-fcr-line bg-white p-4">
      <TruncationBanner result={result} />
      <CountLine result={result} />
      {empty ? (
        <p className="py-8 text-center text-sm text-fcr-steel">No rows match this report.</p>
      ) : result.mode === "tabular" ? (
        <TabularGrid result={result} fmt={fmt} />
      ) : (
        <SummaryGrid result={result} fmt={fmt} />
      )}
    </div>
  );
}
