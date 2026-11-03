// Pure coverage for renderCell — proves the INJECTED formatters are actually used (money→money fmt,
// number→number fmt) and the non-injected cases (date head, boolean, null em-dash, string passthrough)
// are unchanged from the dispatch original. No React, no DOM.

import { describe, it, expect } from "vitest";
import type { ReportColumn } from "@fcr/core/reports";
import { renderCell, defaultFormatters, formatDateCell, dateInputValue, type CellFormatters } from "./cells.js";

// Sentinel formatters: prove renderCell routes money→money and number→number (not swapped, not a default).
const fmt: CellFormatters = {
  money: (v) => `MONEY(${String(v)})`,
  number: (v) => `NUM(${String(v)})`,
};

const col = (type: ReportColumn["type"]): ReportColumn => ({ key: "c", label: "C", type, numeric: type === "money" || type === "number" });

describe("renderCell — injected formatters + fixed cases", () => {
  it("null → em dash regardless of type", () => {
    expect(renderCell(null, col("money"), fmt)).toBe("—");
    expect(renderCell(null, col("string"), fmt)).toBe("—");
  });

  it("money routes through the injected money formatter", () => {
    expect(renderCell(1500, col("money"), fmt)).toBe("MONEY(1500)");
  });

  it("number routes through the injected number formatter", () => {
    expect(renderCell(1234.5, col("number"), fmt)).toBe("NUM(1234.5)");
  });

  it("boolean → Yes/No (no formatter)", () => {
    expect(renderCell(true, col("boolean"), fmt)).toBe("Yes");
    expect(renderCell(false, col("boolean"), fmt)).toBe("No");
  });

  it("date → the YYYY-MM-DD head by default (no formatter, dateStyle omitted = iso)", () => {
    expect(renderCell("2026-09-11T13:45:00Z", col("date"), fmt)).toBe("2026-09-11");
  });

  it("date with dateStyle 'us' → MM/DD/YY", () => {
    expect(renderCell("2026-09-11", col("date"), fmt, "us")).toBe("09/11/26");
    expect(renderCell("2026-09-11T13:45:00Z", col("date"), fmt, "us")).toBe("09/11/26");
  });

  it("date 'us' is only for date columns — other types ignore dateStyle", () => {
    expect(renderCell(1500, col("money"), fmt, "us")).toBe("MONEY(1500)");
    expect(renderCell("In Repair", col("enum"), fmt, "us")).toBe("In Repair");
  });

  it("string/enum → passthrough", () => {
    expect(renderCell("In Repair", col("enum"), fmt)).toBe("In Repair");
    expect(renderCell("hello", col("string"), fmt)).toBe("hello");
  });
});

describe("formatDateCell — iso (default) vs us", () => {
  it("iso is byte-identical to the historical slice(0,10) for strings", () => {
    expect(formatDateCell("2026-01-05")).toBe("2026-01-05");
    expect(formatDateCell("2026-01-05T23:59:00Z")).toBe("2026-01-05");
  });
  it("us reshapes YYYY-MM-DD head to MM/DD/YY (pure string, no Date)", () => {
    expect(formatDateCell("2026-01-05", "us")).toBe("01/05/26");
    expect(formatDateCell("2026-12-31T00:00:00", "us")).toBe("12/31/26");
  });
  it("hydrated JS Date reads UTC parts (no evening-Central day rollback)", () => {
    // neon hands back a local-midnight Date for a date column; UTC getters keep the calendar day.
    const d = new Date(Date.UTC(2026, 0, 5)); // 2026-01-05
    expect(formatDateCell(d, "us")).toBe("01/05/26");
    expect(formatDateCell(d)).toBe("2026-01-05");
  });
  it("null/blank → em dash; unparseable → unchanged", () => {
    expect(formatDateCell(null, "us")).toBe("—");
    expect(formatDateCell("", "us")).toBe("—");
    expect(formatDateCell("not-a-date", "us")).toBe("not-a-date");
  });
});

describe("dateInputValue — the editable date cell's <input type=date> value", () => {
  it("a neon-hydrated Date normalizes to YYYY-MM-DD (NOT String(Date), which the date input rejects)", () => {
    // The HIGH finding: the editable path did String(v); for a Date that is "Fri Sep 11 2026 …" → blank input.
    expect(dateInputValue(new Date(Date.UTC(2026, 8, 11)))).toBe("2026-09-11");
    expect(String(new Date(Date.UTC(2026, 8, 11)))).not.toBe("2026-09-11"); // the bug this guards
  });
  it("a YYYY-MM-DD string passes through; null/invalid → empty string", () => {
    expect(dateInputValue("2026-09-11")).toBe("2026-09-11");
    expect(dateInputValue(null)).toBe("");
    expect(dateInputValue("" as unknown as null)).toBe("");
  });
});

describe("default formatters (used when fmt is omitted)", () => {
  it("money defaults to en-US USD", () => {
    expect(renderCell(1500, col("money"))).toBe("$1,500.00");
    expect(defaultFormatters.money(1234.5)).toBe("$1,234.50");
  });
  it("number defaults to grouped en-US", () => {
    expect(renderCell(1234.5, col("number"))).toBe("1,234.5");
  });
  it("null/blank/non-finite → em dash", () => {
    expect(defaultFormatters.money("")).toBe("—");
    expect(defaultFormatters.number("abc")).toBe("—");
    expect(renderCell(null, col("money"))).toBe("—");
  });
});
