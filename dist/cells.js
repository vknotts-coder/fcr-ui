// Shared tabular-cell rendering for the reports + list-view grids. Pure (type-only imports from the
// @fcr/core reports engine + the INJECTED formatters), so it is safe in BOTH a client bundle
// (report-results.tsx, 'use client') and a server component (list-grid.tsx). Extracted so the two grids
// can't drift on how a cell is formatted or styled — date-only slicing, the "—" null render, and the td
// classes live once.
//
// The formatters (money/number) are INJECTED, not imported: @fcr/ui ships no locale/currency policy of its
// own — the consuming app owns that (fcr-dispatch's src/lib/format.ts) and passes it in. This keeps the
// package app-agnostic (the #99 Slice D "cells takes injected formatters" decision).
// The built-in DEFAULT formatters — generic en-US USD + grouped number, matching fcr-dispatch's
// fmtMoney/fmtNumber (null/blank/non-finite → "—"). `fmt` is OPTIONAL: a consumer that wants these (every
// FCR app so far) passes nothing. Why a default and not a required prop: the report builder/results are
// `'use client'` components usually rendered by a SERVER page, and a plain function can't cross the RSC
// boundary as a prop — so a server page CANNOT inject formatters into a client grid. A default sidesteps
// that for the common case; a consumer needing custom formatting overrides `fmt` at a client boundary.
const _usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const _toMoney = (v) => {
    if (v === null || v === undefined || v === "")
        return "—";
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? _usd.format(n) : "—";
};
const _toNumber = (v) => {
    if (v === null || v === undefined || v === "")
        return "—";
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n.toLocaleString("en-US") : "—";
};
export const defaultFormatters = { money: _toMoney, number: _toNumber };
/** Render a typed cell to display text. Date columns show the YYYY-MM-DD head (the runner already emits a
 *  calendar-date string); money/number go through the formatters (the built-in defaults unless overridden);
 *  null is an em dash. */
export function renderCell(value, col, fmt = defaultFormatters) {
    if (value === null)
        return "—";
    switch (col.type) {
        case "money":
            return fmt.money(value);
        case "number":
            return fmt.number(value);
        case "boolean":
            return value ? "Yes" : "No";
        case "date":
            return String(value).slice(0, 10);
        default:
            return String(value);
    }
}
// Shared body-cell Tailwind classes (text vs right-aligned numeric). The `fcr-*` tokens are defined by the
// CONSUMER's Tailwind theme — a consumer must include node_modules/@fcr/ui/dist/** in its Tailwind `content`.
export const cellTd = "px-3 py-1.5 text-sm text-fcr-ink border-b border-fcr-line/60 whitespace-nowrap";
export const cellTdNum = "px-3 py-1.5 text-sm text-fcr-ink text-right tabular-nums border-b border-fcr-line/60 whitespace-nowrap";
