// Pure reorder logic for the column-order control (#88 Track B, B3). Kept React-free so it's unit-testable
// (the @fcr/ui test suite has no component harness) and so the component stays a thin shell over it.
/** Move the item at `from` to `to`, returning a NEW array. An out-of-range or no-op move returns a COPY
 *  (never the input by reference) so every caller owns its result. */
export function moveItem(arr, from, to) {
    const next = arr.slice();
    if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to)
        return next;
    const removed = next.splice(from, 1); // exactly one element (from is in range)
    next.splice(to, 0, ...removed);
    return next;
}
/**
 * Move the column at `index` by `dir` (-1 = earlier/left, +1 = later/right), CLAMPED so it can never enter
 * the locked leading region `[0, lockedLeading)` or run off either end. The locked leaders (default the
 * record-link column) stay pinned at the front. Returns a new array; a disallowed move returns a copy
 * unchanged. `lockedLeading` is clamped to [0, length].
 */
export function moveColumn(order, index, dir, lockedLeading) {
    const lock = Math.min(Math.max(0, lockedLeading), order.length);
    const to = index + dir;
    if (index < lock || to < lock || to >= order.length)
        return order.slice();
    return moveItem(order, index, to);
}
/** True when two column lists carry the same keys in the same order. */
export function sameKeyOrder(a, b) {
    return a.length === b.length && a.every((c, i) => c.key === b[i].key);
}
/**
 * Reconcile a (possibly stale) saved order against the LIVE columns: keep the saved items whose key still
 * exists in `live` (in saved order), then append any live column the saved order never mentioned, in live
 * order, at the end. Dead keys are dropped; new columns appear (at the end) rather than vanishing. Prefers
 * the LIVE instance of each column (so a changed label/shape comes from live). Result is always exactly the
 * `live` set, reordered — no dups, no extras, nothing invented. Mirrors @fcr/core's read-side
 * `mergeColumnOrder`, applied client-side on SAVE so a save during column drift never persists a stale list.
 */
export function reconcileColumns(saved, live) {
    const liveByKey = new Map(live.map((c) => [c.key, c]));
    const seen = new Set();
    const out = [];
    for (const c of saved) {
        const lc = liveByKey.get(c.key);
        if (lc && !seen.has(c.key)) {
            out.push(lc);
            seen.add(c.key);
        }
    }
    for (const c of live) {
        if (!seen.has(c.key)) {
            out.push(c);
            seen.add(c.key);
        }
    }
    return out;
}
