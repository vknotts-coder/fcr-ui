"use client";

// Per-user column REORDER control for the list-view surface (fcr-trailers epic #88 Track B, Slice B3).
// A small "Columns" panel that lets a user reorder the columns on their own view — reorder ONLY, no
// show/hide, no add (that stays the report builder's job — #88 decision 3). App-agnostic: @fcr/ui owns no
// persistence; the consumer injects `onSave` (its gated server action → @fcr/core saveListViewPref) and
// `onReset` (→ deleteListViewPref), both of which revalidate so the grid re-renders in the new order.
//
// The FIRST `lockedLeading` columns are PINNED (default 1): the ListGrid makes column index 0 the navigable
// record link, so that column must stay first — the control neither moves it nor lets another column move
// above it, and `onSave` always receives the locked leaders first.
//
// Move up/down (= earlier/later in the row). Buttons, not drag: accessible, and robust where a drag + the
// header's sort-click would fight. (Drag is a possible follow-on.)

import { useEffect, useRef, useState, useTransition } from "react";
import { moveColumn, sameKeyOrder, reconcileColumns } from "./column-order.js";

export type OrderableColumn = { key: string; label: string };

export type ColumnOrderActions = {
  /** Persist the user's full column order (locked leaders first). Revalidates so the grid re-renders. */
  onSave: (orderedKeys: string[]) => Promise<void>;
  /** Clear the saved order (reset to the view's default). Revalidates. */
  onReset: () => Promise<void>;
};

export function ColumnOrderControl({
  columns,
  actions,
  lockedLeading = 1,
}: {
  /** The view's columns in CURRENT display order (locked leaders first). */
  columns: OrderableColumn[];
  actions: ColumnOrderActions;
  /** How many leading columns are pinned (not reorderable). Default 1 (the record-link column). */
  lockedLeading?: number;
}) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<OrderableColumn[]>(columns);
  const [lastCols, setLastCols] = useState<OrderableColumn[]>(columns);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  // Popover dismissal: Escape and an outside pointer-down close the panel (only while open). A bare toggled
  // div otherwise floats over the grid and traps no focus — this keeps it a well-behaved popover without a
  // full modal/focus-trap (it is a lightweight reorder panel, not a modal dialog).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // Re-sync the working order when the view's columns change under us (a save revalidated, or the user
  // switched views) — but ONLY while the panel is closed and no save is in flight, so we never clobber an
  // in-progress reorder or a just-saved optimistic state (the inline-edit re-sync lesson, #88 Track A).
  if (!sameKeyOrder(columns, lastCols) && !open && !pending) {
    setLastCols(columns);
    setOrder(columns);
    setError(null);
  }

  const lock = Math.min(Math.max(0, lockedLeading), order.length);
  const dirty = !sameKeyOrder(order, columns);

  function moveCol(index: number, dir: -1 | 1) {
    setOrder((o) => moveColumn(o, index, dir, lock));
  }

  function save() {
    setError(null);
    // Reconcile against the LIVE columns before persisting: if `columns` drifted while the panel was open
    // (a background revalidate), drop any key that's gone and append any new column — so the stored order is
    // never stale (dead key kept / new column omitted). @fcr/core's mergeColumnOrder also reconciles on read,
    // but keeping the store clean avoids persisting a list that no longer matches the view.
    const reconciled = reconcileColumns(order, columns);
    setOrder(reconciled);
    start(async () => {
      try {
        await actions.onSave(reconciled.map((c) => c.key));
        setOpen(false);
      } catch {
        setError("Could not save the column order.");
      }
    });
  }

  function reset() {
    setError(null);
    start(async () => {
      try {
        await actions.onReset();
        setOpen(false);
      } catch {
        setError("Could not reset the column order.");
      }
    });
  }

  const btn =
    "px-2.5 py-1 rounded text-xs font-semibold border border-fcr-line text-fcr-steel hover:border-fcr-red hover:text-fcr-red disabled:opacity-50";

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button type="button" className={btn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Columns
      </button>

      {open && (
        <div
          role="group"
          aria-label="Reorder columns"
          className="absolute z-20 mt-1 w-64 rounded-lg border-2 border-fcr-line bg-white p-3 shadow-lg"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-fcr-steel">Reorder columns</p>
          <ul className="max-h-72 space-y-0.5 overflow-y-auto">
            {order.map((col, i) => {
              const locked = i < lock;
              return (
                <li
                  key={col.key}
                  className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-sm ${locked ? "text-fcr-steel/60" : "text-fcr-ink hover:bg-fcr-paper"}`}
                >
                  <span className="truncate">{col.label}</span>
                  {locked ? (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-fcr-steel/60">pinned</span>
                  ) : (
                    <span className="shrink-0 flex gap-1">
                      <button
                        type="button"
                        className={btn}
                        disabled={pending || i <= lock}
                        onClick={() => moveCol(i, -1)}
                        aria-label={`Move ${col.label} earlier`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={btn}
                        disabled={pending || i >= order.length - 1}
                        onClick={() => moveCol(i, 1)}
                        aria-label={`Move ${col.label} later`}
                      >
                        ↓
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {error && <p className="mt-2 text-[11px] leading-tight text-fcr-red">{error}</p>}

          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" className={btn} disabled={pending} onClick={reset}>
              Reset to default
            </button>
            <button
              type="button"
              className="rounded bg-fcr-ink px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
              disabled={pending || !dirty}
              onClick={save}
            >
              {pending ? "Saving…" : "Save order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
