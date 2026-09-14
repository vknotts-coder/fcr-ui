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
export declare const defaultFormatters: CellFormatters;
/** Render a typed cell to display text. Date columns show the YYYY-MM-DD head (the runner already emits a
 *  calendar-date string); money/number go through the formatters (the built-in defaults unless overridden);
 *  null is an em dash. */
export declare function renderCell(value: CellValue, col: ReportColumn, fmt?: CellFormatters): string;
export declare const cellTd = "px-3 py-1.5 text-sm text-fcr-ink border-b border-fcr-line/60 whitespace-nowrap";
export declare const cellTdNum = "px-3 py-1.5 text-sm text-fcr-ink text-right tabular-nums border-b border-fcr-line/60 whitespace-nowrap";
//# sourceMappingURL=cells.d.ts.map