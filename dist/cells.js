// Shared tabular-cell rendering for the reports + list-view grids. Pure (type-only imports from the
// @fcr/core reports engine + the INJECTED formatters), so it is safe in BOTH a client bundle
// (report-results.tsx, 'use client') and a server component (list-grid.tsx). Extracted so the two grids
// can't drift on how a cell is formatted or styled — date-only slicing, the "—" null render, and the td
// classes live once.
//
// The formatters (money/number) are INJECTED, not imported: @fcr/ui ships no locale/currency policy of its
// own — the consuming app owns that (fcr-dispatch's src/lib/format.ts) and passes it in. This keeps the
// package app-agnostic (the #99 Slice D "cells takes injected formatters" decision).
/** Render a typed cell to display text. Date columns show the YYYY-MM-DD head (the runner already emits a
 *  calendar-date string); money/number go through the INJECTED formatters; null is an em dash. */
export function renderCell(value, col, fmt) {
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
