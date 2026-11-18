// Carry-over contract for "+ Add {unit}" (Van 2026-11-18): a newly-added truck/trailer inherits the
// previous unit's field values EXCEPT the identity columns (Unit #, VIN). Pure helper, no DOM.

import { describe, it, expect } from "vitest";
import { carryOverValues, DEFAULT_CARRY_OVER_EXCLUDE_COLUMNS } from "./multi-intake-form.js";

// Reference the component's REAL default, never a re-typed copy — otherwise the test validates its
// own literals and can never catch the default drifting from the specs' identity columns.
const DEFAULT_EXCLUDE = DEFAULT_CARRY_OVER_EXCLUDE_COLUMNS;

describe("carryOverValues", () => {
  it("carries every prior field except the identity columns", () => {
    const prev = {
      sf_name: "T-100",
      vin: "1FUJGLDR0CSBX1234",
      status: "Awaiting Pickup",
      shop: "Livingston",
      pickup_city: "Nashville",
      pickup_notes: "call first",
    };
    const next = carryOverValues(prev, DEFAULT_EXCLUDE);
    expect(next).toEqual({
      status: "Awaiting Pickup",
      shop: "Livingston",
      pickup_city: "Nashville",
      pickup_notes: "call first",
    });
    // identity columns are DROPPED (absent), not blanked — the input renders empty on its own
    expect("sf_name" in next).toBe(false);
    expect("vin" in next).toBe(false);
  });

  it("drops the trailer VIN column (full_vin) too", () => {
    const next = carryOverValues({ full_vin: "ABC", sf_name: "TR-9", shop: "Sparta" }, DEFAULT_EXCLUDE);
    expect(next).toEqual({ shop: "Sparta" });
  });

  it("returns an empty object when there is no previous unit", () => {
    expect(carryOverValues(undefined, DEFAULT_EXCLUDE)).toEqual({});
  });

  it("does not mutate the source values", () => {
    const prev = { sf_name: "T-1", shop: "Livingston" };
    const copy = { ...prev };
    carryOverValues(prev, DEFAULT_EXCLUDE);
    expect(prev).toEqual(copy);
  });

  it("an empty exclude list carries over everything (including identity)", () => {
    const prev = { sf_name: "T-1", vin: "V", shop: "Livingston" };
    expect(carryOverValues(prev, [])).toEqual(prev);
  });
});
