// Shared tabular-cell rendering for the reports + list-view grids. Pure (type-only imports from the
// @fcr/core reports engine + the INJECTED formatters), so it is safe in BOTH a client bundle
// (report-results.tsx, 'use client') and a server component (list-grid.tsx). Extracted so the two grids
// can't drift on how a cell is formatted or styled — date-only slicing, the "—" null render, and the td
// classes live once.
//
// The formatters (money/number) are INJECTED, not imported: @fcr/ui ships no locale/currency policy of its
// own — the consuming app owns that (fcr-dispatch's src/lib/format.ts) and passes it in. This keeps the
// package app-agnostic (the #99 Slice D "cells takes injected formatters" decision).
/** Render a calendar-date value as the requested style. Accepts the `YYYY-MM-DD` string the reports engine
 *  emits AND a hydrated JS `Date` (neon turns a `date`/`timestamp` column into a local-midnight Date — see
 *  the fcr-neon-date-hydration lesson); for a Date it reads UTC parts so an evening-Central render can't roll
 *  back a day. null/blank → "—"; an unparseable value falls through unchanged. `"iso"` is byte-identical to
 *  the historical `String(value).slice(0, 10)` for the string case. */
export function formatDateCell(value, style = "iso") {
    if (value === null || value === undefined || value === "")
        return "—";
    let head;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime()))
            return "—";
        const y = value.getUTCFullYear();
        const m = String(value.getUTCMonth() + 1).padStart(2, "0");
        const d = String(value.getUTCDate()).padStart(2, "0");
        head = `${y}-${m}-${d}`;
    }
    else {
        head = String(value).slice(0, 10);
    }
    if (style === "iso")
        return head;
    // "us": reshape a YYYY-MM-DD head to MM/DD/YY; leave anything that isn't that shape untouched.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(head);
    if (!m)
        return head;
    const [, yyyy, mm, dd] = m;
    return `${mm}/${dd}/${yyyy.slice(2)}`;
}
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
/** The raw value an editable DATE cell binds to its `<input type="date">` — a `YYYY-MM-DD` calendar string.
 *  A neon-hydrated `Date` must NOT be `String()`-ified for this (that yields a locale toString the date input
 *  rejects as blank, and the resting display can't parse) — route it through the SAME calendar-date
 *  normalization the display uses. `"—"` (empty/invalid) collapses to `""` (an empty date input). */
export function dateInputValue(value) {
    const iso = formatDateCell(value, "iso");
    return iso === "—" ? "" : iso;
}
/** Render a typed cell to display text. Date columns render per `dateStyle` (default `"iso"` = the historical
 *  YYYY-MM-DD head; a consumer passes `"us"` for MM/DD/YY). money/number go through the formatters (the
 *  built-in defaults unless overridden); null is an em dash. `dateStyle` is a serializable string, so unlike
 *  `fmt` a server page CAN pass it into a client grid. */
export function renderCell(value, col, fmt = defaultFormatters, dateStyle = "iso") {
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
            return formatDateCell(value, dateStyle);
        default:
            return String(value);
    }
}
// Shared body-cell Tailwind classes (text vs right-aligned numeric). The `fcr-*` tokens are defined by the
// CONSUMER's Tailwind theme — a consumer must include node_modules/@fcr/ui/dist/** in its Tailwind `content`.
export const cellTd = "px-3 py-1.5 text-sm text-fcr-ink border-b border-fcr-line/60 whitespace-nowrap";
export const cellTdNum = "px-3 py-1.5 text-sm text-fcr-ink text-right tabular-nums border-b border-fcr-line/60 whitespace-nowrap";
