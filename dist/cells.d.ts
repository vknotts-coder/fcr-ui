import type { CellValue, ReportColumn } from "@fcr/core/reports";
/** A value formatter: money-or-numeric-string (or anything) → display string. Matches the shape of
 *  fcr-dispatch's fmtMoney/fmtNumber (null/blank/non-finite → "—"). The consumer supplies these so the
 *  package carries no locale/currency policy. */
export type Formatter = (value: unknown) => string;
/** The formatters the grids need: money columns through `money`, number columns through `number`. */
export type CellFormatters = {
    money: Formatter;
    number: Formatter;
};
/** How a `date` cell renders. SERIALIZABLE (a plain string, not a function) so a SERVER page can pass it
 *  across the RSC boundary into a client grid — the exact thing `fmt` (functions) cannot do. Date columns
 *  carry a `YYYY-MM-DD` calendar head, so both styles are pure string reshaping (no `new Date()`, no
 *  timezone drift).
 *  - `"iso"`  → `YYYY-MM-DD` (the long-standing default; unchanged for every app that doesn't opt in).
 *  - `"us"`   → `MM/DD/YY`   (fcr-trailers, 2026-11-03). */
export type DateStyle = "iso" | "us";
/** Render a calendar-date value as the requested style. Accepts the `YYYY-MM-DD` string the reports engine
 *  emits AND a hydrated JS `Date` (neon turns a `date`/`timestamp` column into a local-midnight Date — see
 *  the fcr-neon-date-hydration lesson); for a Date it reads UTC parts so an evening-Central render can't roll
 *  back a day. null/blank → "—"; an unparseable value falls through unchanged. `"iso"` is byte-identical to
 *  the historical `String(value).slice(0, 10)` for the string case. */
export declare function formatDateCell(value: unknown, style?: DateStyle): string;
export declare const defaultFormatters: CellFormatters;
/** The raw value an editable DATE cell binds to its `<input type="date">` — a `YYYY-MM-DD` calendar string.
 *  A neon-hydrated `Date` must NOT be `String()`-ified for this (that yields a locale toString the date input
 *  rejects as blank, and the resting display can't parse) — route it through the SAME calendar-date
 *  normalization the display uses. `"—"` (empty/invalid) collapses to `""` (an empty date input). */
export declare function dateInputValue(value: CellValue): string;
/** Render a typed cell to display text. Date columns render per `dateStyle` (default `"iso"` = the historical
 *  YYYY-MM-DD head; a consumer passes `"us"` for MM/DD/YY). money/number go through the formatters (the
 *  built-in defaults unless overridden); null is an em dash. `dateStyle` is a serializable string, so unlike
 *  `fmt` a server page CAN pass it into a client grid. */
export declare function renderCell(value: CellValue, col: ReportColumn, fmt?: CellFormatters, dateStyle?: DateStyle): string;
export declare const cellTd = "px-3 py-1.5 text-sm text-fcr-ink border-b border-fcr-line/60 whitespace-nowrap";
export declare const cellTdNum = "px-3 py-1.5 text-sm text-fcr-ink text-right tabular-nums border-b border-fcr-line/60 whitespace-nowrap";
//# sourceMappingURL=cells.d.ts.map