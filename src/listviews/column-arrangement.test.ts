import { describe, it, expect } from "vitest";
import {
  toggleHidden,
  reconcileArrangement,
  serializeArrangement,
  sameArrangement,
  type HideableColumn,
} from "./column-order.js";

// Pure show/hide + reorder helpers behind ColumnControl (Track C, #402 C2). Column index 0 = the
// record-link leader when lockedLeading:1.
const col = (key: string, hidden = false): HideableColumn => ({ key, label: key.toUpperCase(), hidden });
const arr = (...keys: string[]) => keys.map((k) => col(k));

describe("toggleHidden", () => {
  it("flips the hidden flag of a non-locked column, returning a NEW array", () => {
    const cols = arr("id", "a", "b");
    const out = toggleHidden(cols, 1, 1);
    expect(out[1]).toEqual({ key: "a", label: "A", hidden: true });
    expect(out).not.toBe(cols);
    expect(cols[1]!.hidden).toBe(false); // input untouched
    // flip back
    expect(toggleHidden(out, 1, 1)[1]!.hidden).toBe(false);
  });

  it("NEVER hides a locked leader (no-op copy)", () => {
    const cols = arr("id", "a");
    const out = toggleHidden(cols, 0, 1);
    expect(out[0]!.hidden).toBe(false);
    expect(out).not.toBe(cols);
  });

  it("out-of-range index is a copy unchanged", () => {
    const cols = arr("id", "a");
    expect(toggleHidden(cols, 9, 1)).toEqual(cols);
    expect(toggleHidden(cols, -1, 1)).toEqual(cols);
  });
});

describe("serializeArrangement", () => {
  it("emits the full ordered keys + the hidden subset", () => {
    const cols = [col("id"), col("a", true), col("b"), col("c", true)];
    expect(serializeArrangement(cols)).toEqual({ order: ["id", "a", "b", "c"], hidden: ["a", "c"] });
  });
  it("nothing hidden → empty hidden list (round-trips to the bare-array store on the @fcr/core side)", () => {
    expect(serializeArrangement(arr("id", "a", "b"))).toEqual({ order: ["id", "a", "b"], hidden: [] });
  });

  it("WRITE-SIDE FLOOR: an all-hidden arrangement keeps the FIRST column visible (never a zero-visible store)", () => {
    const allHidden = [col("id", true), col("a", true), col("b", true)];
    expect(serializeArrangement(allHidden)).toEqual({ order: ["id", "a", "b"], hidden: ["a", "b"] });
  });
});

describe("sameArrangement", () => {
  it("true only when keys, order AND hidden flags all match", () => {
    expect(sameArrangement(arr("id", "a", "b"), arr("id", "a", "b"))).toBe(true);
    expect(sameArrangement([col("id"), col("a", true)], [col("id"), col("a", true)])).toBe(true);
    expect(sameArrangement([col("id"), col("a", true)], [col("id"), col("a")])).toBe(false); // hidden differs
    expect(sameArrangement(arr("id", "a", "b"), arr("id", "b", "a"))).toBe(false); // order differs
    expect(sameArrangement(arr("id", "a"), arr("id", "a", "b"))).toBe(false); // length differs
  });
});

describe("reconcileArrangement", () => {
  const live = arr("id", "a", "b", "c");

  it("no drift → preserves the working order + hidden flags, taking labels from live", () => {
    const working = [col("id"), col("c"), col("a", true), col("b")];
    const out = reconcileArrangement(working, live);
    expect(out.map((c) => c.key)).toEqual(["id", "c", "a", "b"]);
    expect(out.find((c) => c.key === "a")!.hidden).toBe(true);
    expect(out.every((c) => c.label === c.key.toUpperCase())).toBe(true); // labels from live
  });

  it("drops a key gone from live", () => {
    const working = [col("id"), col("gone", true), col("a")];
    expect(reconcileArrangement(working, live).map((c) => c.key)).toEqual(["id", "a", "b", "c"]);
  });

  it("appends a NEW live column (absent from working) VISIBLE, at the end", () => {
    const working = [col("id"), col("b", true), col("a")]; // saved before "c" existed; b hidden
    const out = reconcileArrangement(working, live);
    expect(out.map((c) => c.key)).toEqual(["id", "b", "a", "c"]);
    expect(out.find((c) => c.key === "c")!.hidden).toBe(false); // new col visible
    expect(out.find((c) => c.key === "b")!.hidden).toBe(true); // explicit hide preserved
  });

  it("INVARIANT: result is exactly the live set, arranged (no dups, no extras)", () => {
    const working = [col("x"), col("c", true), col("c"), col("id")];
    const out = reconcileArrangement(working, live);
    expect(out.map((c) => c.key).sort()).toEqual(["a", "b", "c", "id"]);
    expect(new Set(out.map((c) => c.key)).size).toBe(out.length);
  });

  it("does not mutate its inputs", () => {
    const working = [col("id"), col("a", true)];
    const liveCopy = arr("id", "a", "b");
    reconcileArrangement(working, liveCopy);
    expect(working).toEqual([col("id"), col("a", true)]);
    expect(liveCopy).toEqual(arr("id", "a", "b"));
  });

  it("serialize∘reconcile yields the @fcr/core save shape", () => {
    const working = [col("id"), col("c", true), col("a")];
    expect(serializeArrangement(reconcileArrangement(working, live)))
      .toEqual({ order: ["id", "c", "a", "b"], hidden: ["c"] });
  });

  it("DRIFT: the last visible column drops from live → the write-side floor still keeps one visible", () => {
    // working: only "a" is visible; both others hidden. live drops "a" (and has no leader to force).
    const working = [col("id", true), col("a"), col("b", true)];
    const liveNoA = [col("id"), col("b")];
    const arrangement = reconcileArrangement(working, liveNoA); // id(hidden), b(hidden) → all hidden
    expect(arrangement.every((c) => c.hidden)).toBe(true);
    expect(serializeArrangement(arrangement)).toEqual({ order: ["id", "b"], hidden: ["b"] }); // id forced visible
  });
});
