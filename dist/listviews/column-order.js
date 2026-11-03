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
