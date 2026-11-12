/** One section's stateful bits: its key and whether its body is collapsed. Title + content live in the
 *  component (they come from props and aren't part of the persisted/movable state). */
export type SectionMeta = {
    key: string;
    collapsed: boolean;
};
/** Move the section at `index` by `dir` (-1 up, +1 down), clamped out of the locked leading region
 *  (`lock` = 1 when the pinned section is first, so it never moves and nothing moves above it). */
export declare function moveSection(items: SectionMeta[], index: number, dir: -1 | 1, lock: number): SectionMeta[];
/** Toggle the collapsed flag of the section at `index`, returning a NEW array. NO lock — every section,
 *  the pinned one included, can be collapsed. An out-of-range index returns a copy unchanged. */
export declare function toggleCollapsed(items: SectionMeta[], index: number): SectionMeta[];
/** Serialize the working state to the @fcr/core `saveRecordSectionPref` shape: the full ordered key list
 *  plus the collapsed subset (always ⊆ order). */
export declare function serializeSections(items: SectionMeta[]): {
    order: string[];
    collapsed: string[];
};
/** True when two section states carry the same keys in the same order AND the same collapsed flags. */
export declare function sameSectionState(a: SectionMeta[], b: SectionMeta[]): boolean;
/**
 * Reconcile the working state against the LIVE section keys (the sections the page currently offers), so a
 * registry change under an open tab never breaks the layout: keep working sections whose key still exists (in
 * working order, carrying the collapsed flag), append any live key the working set never named — EXPANDED, in
 * live order — and drop a key no longer live. Then force `pinnedKey` back to the front. Result set is exactly
 * the live set. Mirrors @fcr/core's read-side `resolveSections`, applied client-side when props drift.
 */
export declare function reconcileSections(working: SectionMeta[], liveKeys: string[], pinnedKey?: string): SectionMeta[];
//# sourceMappingURL=section-state.d.ts.map