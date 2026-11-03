import { describe, it, expect } from "vitest";
import { moveItem, moveColumn, sameKeyOrder, reconcileColumns } from "./column-order.js";

describe("moveItem", () => {
  it("moves an item to a new position", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("returns a COPY (never the input by reference), even on a no-op", () => {
    const src = ["a", "b", "c"];
    expect(moveItem(src, 1, 1)).not.toBe(src); // no-op still a copy
    expect(moveItem(src, 1, 1)).toEqual(src);
    expect(moveItem(src, 5, 0)).not.toBe(src); // out-of-range still a copy
    expect(moveItem(src, 0, 9)).toEqual(src);
    moveItem(src, 0, 2).push("x");
    expect(src).toEqual(["a", "b", "c"]); // input untouched
  });
});

describe("moveColumn", () => {
  const cols = ["unit", "customer", "status", "team"]; // index 0 = locked record-link column

  it("moves a column later/earlier within the movable region", () => {
    expect(moveColumn(cols, 1, 1, 1)).toEqual(["unit", "status", "customer", "team"]); // customer → later
    expect(moveColumn(cols, 3, -1, 1)).toEqual(["unit", "customer", "team", "status"]); // team → earlier
  });

  it("clamps at the locked boundary — a movable column can't cross above the locked leaders", () => {
    // index 1 is the first movable column; moving it earlier would enter the locked region [0,1).
    expect(moveColumn(cols, 1, -1, 1)).toEqual(cols); // no-op
  });

  it("never moves a locked leader", () => {
    expect(moveColumn(cols, 0, 1, 1)).toEqual(cols); // the record-link column stays put
  });

  it("clamps at the ends", () => {
    expect(moveColumn(cols, 3, 1, 1)).toEqual(cols); // last column can't move later
  });

  it("supports more than one locked leader", () => {
    // lockedLeading=2: unit + customer pinned; status is the first movable.
    expect(moveColumn(cols, 2, -1, 2)).toEqual(cols); // status can't cross above the 2 locked
    expect(moveColumn(cols, 3, -1, 2)).toEqual(["unit", "customer", "team", "status"]); // team → earlier is fine
  });

  it("returns a copy (caller-owned) on a no-op move", () => {
    expect(moveColumn(cols, 0, 1, 1)).not.toBe(cols);
  });
});

describe("reconcileColumns", () => {
  const col = (key: string, label = key) => ({ key, label });
  const live = [col("unit"), col("customer"), col("status"), col("team")];

  it("keeps a valid saved order, preferring the live instance (e.g. a changed label)", () => {
    const saved = [col("unit"), col("status", "OLD"), col("customer"), col("team")];
    expect(reconcileColumns(saved, live)).toEqual([col("unit"), col("status"), col("customer"), col("team")]);
  });

  it("drops a saved key that no longer exists in live", () => {
    const saved = [col("unit"), col("GONE"), col("status")];
    // dead key dropped; remaining live (customer, team) appended in live order.
    expect(reconcileColumns(saved, live)).toEqual([col("unit"), col("status"), col("customer"), col("team")]);
  });

  it("appends a NEW live column the saved order never mentioned, at the end", () => {
    const saved = [col("unit"), col("status"), col("customer")]; // saved before "team" existed
    expect(reconcileColumns(saved, live)).toEqual([col("unit"), col("status"), col("customer"), col("team")]);
  });

  it("dedupes a repeated saved key", () => {
    const saved = [col("unit"), col("status"), col("status"), col("customer")];
    expect(reconcileColumns(saved, live)).toEqual([col("unit"), col("status"), col("customer"), col("team")]);
  });

  it("INVARIANT: output is always exactly the live set, reordered", () => {
    for (const saved of [[], [col("GONE")], [col("team"), col("unit")], [col("status"), col("x"), col("unit")]]) {
      const out = reconcileColumns(saved, live);
      expect(out.map((c) => c.key).sort()).toEqual(live.map((c) => c.key).sort());
      expect(new Set(out.map((c) => c.key)).size).toBe(out.length);
    }
  });
});

describe("sameKeyOrder", () => {
  const a = [{ key: "x" }, { key: "y" }, { key: "z" }];
  it("true for same keys in same order", () => {
    expect(sameKeyOrder(a, [{ key: "x" }, { key: "y" }, { key: "z" }])).toBe(true);
  });
  it("false for a different order", () => {
    expect(sameKeyOrder(a, [{ key: "y" }, { key: "x" }, { key: "z" }])).toBe(false);
  });
  it("false for a different length", () => {
    expect(sameKeyOrder(a, [{ key: "x" }, { key: "y" }])).toBe(false);
  });
});
