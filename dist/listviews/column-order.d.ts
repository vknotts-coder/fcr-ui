/** Move the item at `from` to `to`, returning a NEW array. An out-of-range or no-op move returns a COPY
 *  (never the input by reference) so every caller owns its result. */
export declare function moveItem<T>(arr: T[], from: number, to: number): T[];
/**
 * Move the column at `index` by `dir` (-1 = earlier/left, +1 = later/right), CLAMPED so it can never enter
 * the locked leading region `[0, lockedLeading)` or run off either end. The locked leaders (default the
 * record-link column) stay pinned at the front. Returns a new array; a disallowed move returns a copy
 * unchanged. `lockedLeading` is clamped to [0, length].
 */
export declare function moveColumn<T>(order: T[], index: number, dir: -1 | 1, lockedLeading: number): T[];
/** True when two column lists carry the same keys in the same order. */
export declare function sameKeyOrder(a: {
    key: string;
}[], b: {
    key: string;
}[]): boolean;
/**
 * Reconcile a (possibly stale) saved order against the LIVE columns: keep the saved items whose key still
 * exists in `live` (in saved order), then append any live column the saved order never mentioned, in live
 * order, at the end. Dead keys are dropped; new columns appear (at the end) rather than vanishing. Prefers
 * the LIVE instance of each column (so a changed label/shape comes from live). Result is always exactly the
 * `live` set, reordered — no dups, no extras, nothing invented. Mirrors @fcr/core's read-side
 * `mergeColumnOrder`, applied client-side on SAVE so a save during column drift never persists a stale list.
 */
export declare function reconcileColumns<T extends {
    key: string;
}>(saved: T[], live: T[]): T[];
export type HideableColumn = {
    key: string;
    label: string;
    hidden: boolean;
};
/**
 * Toggle the `hidden` flag of the column at `index`, returning a NEW array. A locked-leading column
 * (`index < lockedLeading`) is NEVER hidden — its toggle is a no-op copy (the record-link column must stay
 * visible). An out-of-range index returns a copy unchanged.
 */
export declare function toggleHidden(cols: HideableColumn[], index: number, lockedLeading: number): HideableColumn[];
/**
 * Reconcile a (possibly stale) working arrangement against the LIVE columns, preserving the user's order
 * AND hidden flags: keep working items whose key still exists in `live` (in working order, carrying the
 * working `hidden` flag but the LIVE label), then append any live column the working set never mentioned —
 * VISIBLE, in live order, at the end (a column added to the catalog since the user arranged shows up, never
 * silently hidden). Dead keys drop. Mirrors @fcr/core's read-side `resolveColumns`, applied client-side on
 * SAVE so a save during drift never persists a stale arrangement. Result is exactly the `live` set, arranged.
 */
export declare function reconcileArrangement(working: HideableColumn[], live: HideableColumn[]): HideableColumn[];
/** Serialize a working arrangement to the @fcr/core `saveListViewPref` shape: the full ordered key list
 *  plus the hidden subset. (The record-link / locked leaders are never hidden, so they never appear in
 *  `hidden` by construction.)
 *
 *  WRITE-SIDE empty-grid floor: never serialize an arrangement with zero visible columns. The UI already
 *  forbids hiding the last visible column, but drift (the panel left open suppresses re-sync, so the last
 *  visible key could drop out of `live` with nothing new appended) could otherwise produce an all-hidden
 *  result — and with `lockedLeading:0` there is no forced leader. If every column is hidden, keep the FIRST
 *  one visible before persisting. @fcr/core `resolveColumns` has the same net on read; this stops a
 *  zero-visible arrangement from ever reaching the store. */
export declare function serializeArrangement(cols: HideableColumn[]): {
    order: string[];
    hidden: string[];
};
/** True when two arrangements carry the same keys in the same order AND the same hidden flags. */
export declare function sameArrangement(a: HideableColumn[], b: HideableColumn[]): boolean;
//# sourceMappingURL=column-order.d.ts.map