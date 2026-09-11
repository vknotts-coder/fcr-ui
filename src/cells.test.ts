// Pure coverage for renderCell — proves the INJECTED formatters are actually used (money→money fmt,
// number→number fmt) and the non-injected cases (date head, boolean, null em-dash, string passthrough)
// are unchanged from the dispatch original. No React, no DOM.

import { describe, it, expect } from "vitest";
import type { ReportColumn } from "@fcr/core/reports";
import { renderCell, type CellFormatters } from "./cells.js";

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

  it("date → the YYYY-MM-DD head (no formatter)", () => {
    expect(renderCell("2026-09-11T13:45:00Z", col("date"), fmt)).toBe("2026-09-11");
  });

  it("string/enum → passthrough", () => {
    expect(renderCell("In Repair", col("enum"), fmt)).toBe("In Repair");
    expect(renderCell("hello", col("string"), fmt)).toBe("hello");
  });
});
