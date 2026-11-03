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
//# sourceMappingURL=column-order.d.ts.map