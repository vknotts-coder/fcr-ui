import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Sortable table for the Salesforce-style List Views surface. SERVER component — sorting is driven by the
// URL (?sort=<col>&dir=asc|desc): each column header is a <Link> that re-requests the page, which re-runs
// the report with the new ORDER BY server-side. No client JS, no client re-sort — the row cap and RBAC
// scope are always honored because every render is a fresh scoped query. Styling mirrors the report
// builder's TabularGrid (report-results.tsx).
import Link from "next/link";
import { renderCell, cellTd as td, cellTdNum as tdNum } from "../cells.js";
const thBase = "px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-fcr-steel border-b border-fcr-line whitespace-nowrap";
/** Header cell: a link that sorts by this column. Clicking the already-active column flips direction;
 *  a new column starts ascending. Carries aria-sort for assistive tech. `status` (the current dropdown
 *  selection) is preserved in the href so sorting doesn't reset the status filter. */
export function SortableHeader({ col, sort, status }) {
    const active = sort.field === col.key;
    const nextDir = active && sort.dir === "asc" ? "desc" : "asc";
    const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
    const caret = active ? (sort.dir === "asc" ? "▲" : "▼") : "";
    const params = new URLSearchParams();
    if (status)
        params.set("status", status);
    params.set("sort", col.key);
    params.set("dir", nextDir);
    return (_jsx("th", { className: thBase, scope: "col", "aria-sort": ariaSort, style: { textAlign: col.numeric ? "right" : "left" }, children: _jsxs(Link, { href: `?${params.toString()}`, className: `inline-flex items-center gap-1 hover:text-fcr-red ${active ? "text-fcr-red" : ""}`, scroll: false, children: [col.label, _jsx("span", { "aria-hidden": true, className: "text-[8px]", children: caret })] }) }));
}
export default function ListGrid({ result, sort, status, fmt, }) {
    if (result.rows.length === 0) {
        return _jsx("p", { className: "py-10 text-center text-sm text-fcr-steel", children: "No records match this view." });
    }
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full border-collapse", children: [_jsx("thead", { children: _jsx("tr", { children: result.columns.map((c) => (_jsx(SortableHeader, { col: c, sort: sort, status: status }, c.key))) }) }), _jsx("tbody", { children: result.rows.map((row, i) => {
                        const href = result.hrefs[i];
                        return (_jsx("tr", { className: "hover:bg-fcr-paper/60", children: result.columns.map((c, ci) => {
                                const text = renderCell(row[c.key] ?? null, c, fmt);
                                const linked = ci === 0 && href && text !== "—";
                                return (_jsx("td", { className: c.numeric ? tdNum : td, children: linked ? (_jsx(Link, { href: href, className: "text-fcr-red hover:underline font-medium", children: text })) : (text) }, c.key));
                            }) }, i));
                    }) })] }) }));
}
