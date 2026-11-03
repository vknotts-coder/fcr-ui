// Shared tabular-cell rendering for the reports + list-view grids. Pure (type-only imports from the
// @fcr/core reports engine + the INJECTED formatters), so it is safe in BOTH a client bundle
// (report-results.tsx, 'use client') and a server component (list-grid.tsx). Extracted so the two grids
// can't drift on how a cell is formatted or styled — date-only slicing, the "—" null render, and the td
// classes live once.
//
// The formatters (money/number) are INJECTED, not imported: @fcr/ui ships no locale/currency policy of its
// own — the consuming app owns that (fcr-dispatch's src/lib/format.ts) and passes it in. This keeps the
// package app-agnostic (the #99 Slice D "cells takes injected formatters" decision).

import type { CellValue, ReportColumn } from "@fcr/core/reports";

/** A value formatter: money-or-numeric-string (or anything) → display string. Matches the shape of
 *  fcr-dispatch's fmtMoney/fmtNumber (null/blank/non-finite → "—"). The consumer supplies these so the
 *  package carries no locale/currency policy. */
export type Formatter = (value: unknown) => string;

/** The formatters the grids need: money columns through `money`, number columns through `number`. */
export type CellFormatters = { money: Formatter; number: Formatter };

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
export function formatDateCell(value: unknown, style: DateStyle = "iso"): string {
  if (value === null || value === undefined || value === "") return "—";
  let head: string;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—";
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    head = `${y}-${m}-${d}`;
  } else {
    head = String(value).slice(0, 10);
  }
  if (style === "iso") return head;
  // "us": reshape a YYYY-MM-DD head to MM/DD/YY; leave anything that isn't that shape untouched.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(head);
  if (!m) return head;
  const [, yyyy, mm, dd] = m as unknown as [string, string, string, string];
  return `${mm}/${dd}/${yyyy.slice(2)}`;
}

// The built-in DEFAULT formatters — generic en-US USD + grouped number, matching fcr-dispatch's
// fmtMoney/fmtNumber (null/blank/non-finite → "—"). `fmt` is OPTIONAL: a consumer that wants these (every
// FCR app so far) passes nothing. Why a default and not a required prop: the report builder/results are
// `'use client'` components usually rendered by a SERVER page, and a plain function can't cross the RSC
// boundary as a prop — so a server page CANNOT inject formatters into a client grid. A default sidesteps
// that for the common case; a consumer needing custom formatting overrides `fmt` at a client boundary.
const _usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const _toMoney: Formatter = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? _usd.format(n) : "—";
};
const _toNumber: Formatter = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "—";
};
export const defaultFormatters: CellFormatters = { money: _toMoney, number: _toNumber };

/** Render a typed cell to display text. Date columns render per `dateStyle` (default `"iso"` = the historical
 *  YYYY-MM-DD head; a consumer passes `"us"` for MM/DD/YY). money/number go through the formatters (the
 *  built-in defaults unless overridden); null is an em dash. `dateStyle` is a serializable string, so unlike
 *  `fmt` a server page CAN pass it into a client grid. */
export function renderCell(
  value: CellValue,
  col: ReportColumn,
  fmt: CellFormatters = defaultFormatters,
  dateStyle: DateStyle = "iso",
): string {
  if (value === null) return "—";
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
