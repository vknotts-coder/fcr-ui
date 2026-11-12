import { describe, it, expect } from "vitest";
import {
  moveSection,
  toggleCollapsed,
  serializeSections,
  sameSectionState,
  reconcileSections,
  type SectionMeta,
} from "./section-state.js";

const meta = (keys: string[], collapsed: string[] = []): SectionMeta[] =>
  keys.map((k) => ({ key: k, collapsed: collapsed.includes(k) }));

describe("moveSection", () => {
  const items = meta(["information", "repair", "parts", "invoice"]);

  it("moves a non-locked section up and down", () => {
    expect(moveSection(items, 2, -1, 1).map((s) => s.key)).toEqual(["information", "parts", "repair", "invoice"]);
    expect(moveSection(items, 1, 1, 1).map((s) => s.key)).toEqual(["information", "parts", "repair", "invoice"]);
  });

  it("never moves a section into the locked region (pinned stays first)", () => {
    // index 1 trying to go up into the lock (0) is a no-op.
    expect(moveSection(items, 1, -1, 1).map((s) => s.key)).toEqual(["information", "repair", "parts", "invoice"]);
    // the pinned section itself (index 0) can't move.
    expect(moveSection(items, 0, 1, 1).map((s) => s.key)).toEqual(["information", "repair", "parts", "invoice"]);
  });

  it("clamps a move off the end", () => {
    expect(moveSection(items, 3, 1, 1).map((s) => s.key)).toEqual(["information", "repair", "parts", "invoice"]);
  });

  it("returns a NEW array (never mutates the input)", () => {
    const out = moveSection(items, 2, -1, 1);
    expect(out).not.toBe(items);
    expect(items.map((s) => s.key)).toEqual(["information", "repair", "parts", "invoice"]);
  });
});

describe("toggleCollapsed", () => {
  it("toggles any section, INCLUDING the pinned one (position fixed, collapse allowed)", () => {
    const items = meta(["information", "repair"]);
    expect(toggleCollapsed(items, 0)[0]).toEqual({ key: "information", collapsed: true });
    expect(toggleCollapsed(meta(["information", "repair"], ["repair"]), 1)[1]!.collapsed).toBe(false);
  });

  it("out-of-range is a no-op copy", () => {
    const items = meta(["a", "b"]);
    const out = toggleCollapsed(items, 9);
    expect(out).not.toBe(items);
    expect(out).toEqual(items);
  });
});

describe("serializeSections", () => {
  it("emits the full order and the collapsed subset (⊆ order)", () => {
    const items = meta(["information", "repair", "parts"], ["repair"]);
    expect(serializeSections(items)).toEqual({ order: ["information", "repair", "parts"], collapsed: ["repair"] });
  });

  it("nothing collapsed → empty collapsed list", () => {
    expect(serializeSections(meta(["a", "b"]))).toEqual({ order: ["a", "b"], collapsed: [] });
  });
});

describe("sameSectionState", () => {
  it("compares keys, order, AND collapsed flags", () => {
    expect(sameSectionState(meta(["a", "b"]), meta(["a", "b"]))).toBe(true);
    expect(sameSectionState(meta(["a", "b"]), meta(["b", "a"]))).toBe(false);
    expect(sameSectionState(meta(["a", "b"], ["a"]), meta(["a", "b"]))).toBe(false);
  });
});

describe("reconcileSections", () => {
  it("keeps surviving sections (order + collapsed), appends new expanded, drops gone, re-pins", () => {
    const working = meta(["information", "invoice", "repair", "legacy"], ["invoice"]);
    // "legacy" removed from the registry; "warranty" added; pinned must return to front even if listed later.
    const out = reconcileSections(working, ["repair", "warranty", "invoice", "information"], "information");
    expect(out.map((s) => s.key)).toEqual(["information", "invoice", "repair", "warranty"]);
    expect(out.find((s) => s.key === "invoice")!.collapsed).toBe(true); // flag preserved
    expect(out.find((s) => s.key === "warranty")!.collapsed).toBe(false); // new → expanded
    expect(out.find((s) => s.key === "legacy")).toBeUndefined(); // dropped
  });

  it("result set is exactly the live set — no invent, drop, or duplicate", () => {
    const working = meta(["a", "a", "b"]);
    const out = reconcileSections(working, ["b", "c"], undefined);
    expect(new Set(out.map((s) => s.key))).toEqual(new Set(["b", "c"]));
    expect(out.length).toBe(2);
  });

  it("no-op when live matches working (order preserved, pinned already first)", () => {
    const working = meta(["information", "repair"], ["repair"]);
    expect(reconcileSections(working, ["information", "repair"], "information")).toEqual(working);
  });
});
