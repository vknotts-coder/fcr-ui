// Pure, React-free state logic for the RecordSections component (epic fcr-trailers#103 S2). Kept out of the
// .tsx so it's unit-testable without a component harness (the @fcr/ui convention — see listviews/column-order).
//
// A record page's sections carry an ORDER + a COLLAPSED flag per section, as an individual user preference.
// This mirrors the list-view column arrangement, so the generic `moveColumn` (clamped move with a locked
// leading region) is reused directly for the pinned-first move; collapse has NO lock (the pinned Information
// section IS collapsible — only its POSITION is fixed).
import { moveColumn, reconcileColumns } from "../listviews/column-order.js";
/** Move the section at `index` by `dir` (-1 up, +1 down), clamped out of the locked leading region
 *  (`lock` = 1 when the pinned section is first, so it never moves and nothing moves above it). */
export function moveSection(items, index, dir, lock) {
    return moveColumn(items, index, dir, lock);
}
/** Toggle the collapsed flag of the section at `index`, returning a NEW array. NO lock — every section,
 *  the pinned one included, can be collapsed. An out-of-range index returns a copy unchanged. */
export function toggleCollapsed(items, index) {
    const next = items.map((s) => ({ ...s }));
    if (index < 0 || index >= next.length)
        return next;
    next[index].collapsed = !next[index].collapsed;
    return next;
}
/** Serialize the working state to the @fcr/core `saveRecordSectionPref` shape: the full ordered key list
 *  plus the collapsed subset (always ⊆ order). */
export function serializeSections(items) {
    return { order: items.map((s) => s.key), collapsed: items.filter((s) => s.collapsed).map((s) => s.key) };
}
/** True when two section states carry the same keys in the same order AND the same collapsed flags. */
export function sameSectionState(a, b) {
    return a.length === b.length && a.every((s, i) => s.key === b[i].key && s.collapsed === b[i].collapsed);
}
/**
 * Reconcile the working state against the LIVE section keys (the sections the page currently offers), so a
 * registry change under an open tab never breaks the layout: keep working sections whose key still exists (in
 * working order, carrying the collapsed flag), append any live key the working set never named — EXPANDED, in
 * live order — and drop a key no longer live. Then force `pinnedKey` back to the front. Result set is exactly
 * the live set. Mirrors @fcr/core's read-side `resolveSections`, applied client-side when props drift.
 */
export function reconcileSections(working, liveKeys, pinnedKey) {
    // Delegate the keep-survivors / append-new / drop-dead / dedupe invariant to reconcileColumns over {key}
    // stubs (ONE definition — the same move reconcileArrangement makes), overlay the working collapsed flag via
    // a Map (a section new since the save defaults expanded, `?? false`), then re-pin the pinned section first.
    const workingCollapsed = new Map(working.map((w) => [w.key, w.collapsed]));
    const merged = reconcileColumns(working.map((w) => ({ key: w.key })), liveKeys.map((k) => ({ key: k }))).map((c) => ({ key: c.key, collapsed: workingCollapsed.get(c.key) ?? false }));
    if (pinnedKey) {
        const idx = merged.findIndex((s) => s.key === pinnedKey);
        if (idx > 0)
            merged.unshift(merged.splice(idx, 1)[0]);
    }
    return merged;
}
