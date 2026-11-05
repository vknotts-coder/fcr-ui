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
/**
 * Toggle the `hidden` flag of the column at `index`, returning a NEW array. A locked-leading column
 * (`index < lockedLeading`) is NEVER hidden — its toggle is a no-op copy (the record-link column must stay
 * visible). An out-of-range index returns a copy unchanged.
 */
export function toggleHidden(cols, index, lockedLeading) {
    const lock = Math.min(Math.max(0, lockedLeading), cols.length);
    const next = cols.map((c) => ({ ...c }));
    if (index < lock || index < 0 || index >= next.length)
        return next;
    next[index].hidden = !next[index].hidden;
    return next;
}
/**
 * Reconcile a (possibly stale) working arrangement against the LIVE columns, preserving the user's order
 * AND hidden flags: keep working items whose key still exists in `live` (in working order, carrying the
 * working `hidden` flag but the LIVE label), then append any live column the working set never mentioned —
 * VISIBLE, in live order, at the end (a column added to the catalog since the user arranged shows up, never
 * silently hidden). Dead keys drop. Mirrors @fcr/core's read-side `resolveColumns`, applied client-side on
 * SAVE so a save during drift never persists a stale arrangement. Result is exactly the `live` set, arranged.
 */
export function reconcileArrangement(working, live) {
    const liveByKey = new Map(live.map((c) => [c.key, c]));
    const seen = new Set();
    const out = [];
    for (const w of working) {
        const lc = liveByKey.get(w.key);
        if (lc && !seen.has(w.key)) {
            out.push({ key: lc.key, label: lc.label, hidden: w.hidden });
            seen.add(w.key);
        }
    }
    for (const c of live) {
        if (!seen.has(c.key)) {
            out.push({ key: c.key, label: c.label, hidden: false });
            seen.add(c.key);
        }
    }
    return out;
}
/** Serialize a working arrangement to the @fcr/core `saveListViewPref` shape: the full ordered key list
 *  plus the hidden subset. (The record-link / locked leaders are never hidden, so they never appear in
 *  `hidden` by construction.) */
export function serializeArrangement(cols) {
    return { order: cols.map((c) => c.key), hidden: cols.filter((c) => c.hidden).map((c) => c.key) };
}
/** True when two arrangements carry the same keys in the same order AND the same hidden flags. */
export function sameArrangement(a, b) {
    return a.length === b.length && a.every((c, i) => c.key === b[i].key && c.hidden === b[i].hidden);
}
