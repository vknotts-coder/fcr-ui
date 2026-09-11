"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Presentational results renderer for the report builder. Pure — depends only on the RunOutcome shape from
// the @fcr/core reports engine (imported as TYPES; no server code reaches the client bundle) and the
// INJECTED formatters. Shared by the builder preview and the saved-report page. Tabular vs grouped-summary
// with a grand-total foot row; a truncation banner when the run hit REPORT_ROW_CAP; record links on the
// identifying cell when the object exposes one (trucks today; trailers have no record route so hrefs are
// null and nothing links).
import Link from "next/link";
import { REPORT_ROW_CAP } from "@fcr/core/reports/definition";
import { renderCell, cellTd, cellTdNum } from "../cells.js";
// ── Cell formatting ────────────────────────────────────────────────────────────────────────────────
function renderSummaryCell(value, col, fmt) {
    if (value === null || value === undefined)
        return "—";
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
function TabularGrid({ result, fmt }) {
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full border-collapse", children: [_jsx("thead", { children: _jsx("tr", { children: result.columns.map((c) => (_jsx("th", { className: c.numeric ? thNum : th, scope: "col", children: c.label }, c.key))) }) }), _jsx("tbody", { children: result.rows.map((row, i) => {
                        const href = result.hrefs[i];
                        return (_jsx("tr", { className: "hover:bg-fcr-paper/60", children: result.columns.map((c, ci) => {
                                const text = renderCell(row[c.key] ?? null, c, fmt);
                                // First column links to the record when an href exists and the cell isn't blank.
                                const linked = ci === 0 && href && text !== "—";
                                return (_jsx("td", { className: c.numeric ? tdNum : td, children: linked ? (_jsx(Link, { href: href, className: "text-fcr-red hover:underline font-medium", children: text })) : (text) }, c.key));
                            }) }, i));
                    }) })] }) }));
}
function SummaryGrid({ result, fmt }) {
    const groupLabel = result.group.bucket
        ? `${result.group.label} (${result.group.bucket})`
        : result.group.label || "Group";
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: th, scope: "col", children: groupLabel }), result.columns.map((c) => (_jsx("th", { className: thNum, scope: "col", children: c.label }, c.key)))] }) }), _jsx("tbody", { children: result.rows.map((r, i) => (_jsxs("tr", { className: "hover:bg-fcr-paper/60", children: [_jsx("td", { className: td, children: r.groupValue }), result.columns.map((c) => (_jsx("td", { className: tdNum, children: renderSummaryCell(r.values[c.key] ?? null, c, fmt) }, c.key)))] }, i))) }), _jsx("tfoot", { children: _jsxs("tr", { className: "font-bold", children: [_jsx("td", { className: `${td} font-bold`, children: "Total" }), result.columns.map((c) => (_jsx("td", { className: `${tdNum} font-bold`, children: renderSummaryCell(result.total[c.key] ?? null, c, fmt) }, c.key)))] }) })] }) }));
}
// ── Banners + count line ─────────────────────────────────────────────────────────────────────────
function TruncationBanner({ result }) {
    if (!result.truncated)
        return null;
    const msg = result.mode === "summary"
        ? `Totals cover only the first ${REPORT_ROW_CAP.toLocaleString()} matching rows and are NOT complete. Add filters to bring the report under the cap for exact totals.`
        : `Showing the first ${REPORT_ROW_CAP.toLocaleString()} rows — more rows match. Add filters to narrow the report.`;
    return (_jsxs("div", { className: "mb-3 rounded border border-fcr-amber bg-fcr-amber/10 px-3 py-2 text-sm text-fcr-ink", children: ["\u26A0 ", msg] }));
}
function CountLine({ result }) {
    const text = result.mode === "summary"
        ? `${result.rowCount ?? 0} group${result.rowCount === 1 ? "" : "s"}${result.truncated ? "" : " · exact"}`
        : `${result.rowCount} row${result.rowCount === 1 ? "" : "s"}`;
    return _jsx("p", { className: "mb-2 text-xs uppercase tracking-widest font-bold text-fcr-steel", children: text });
}
// ── Public component ───────────────────────────────────────────────────────────────────────────────
export default function ReportResults({ outcome, fmt }) {
    if (!outcome.ok) {
        return (_jsxs("div", { className: "rounded-lg border-2 border-fcr-red bg-fcr-red/5 p-4", children: [_jsx("p", { className: "text-sm font-bold uppercase tracking-widest text-fcr-red mb-1", children: "Report error" }), _jsx("ul", { className: "list-disc pl-5 text-sm text-fcr-ink", children: outcome.errors.map((e, i) => (_jsx("li", { children: e }, i))) })] }));
    }
    const { result } = outcome;
    const empty = result.rows.length === 0;
    return (_jsxs("div", { className: "rounded-lg border-2 border-fcr-line bg-white p-4", children: [_jsx(TruncationBanner, { result: result }), _jsx(CountLine, { result: result }), empty ? (_jsx("p", { className: "py-8 text-center text-sm text-fcr-steel", children: "No rows match this report." })) : result.mode === "tabular" ? (_jsx(TabularGrid, { result: result, fmt: fmt })) : (_jsx(SummaryGrid, { result: result, fmt: fmt }))] }));
}
