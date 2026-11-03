"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useState, useTransition } from "react";
import { moveColumn, sameKeyOrder } from "./column-order.js";
export function ColumnOrderControl({ columns, actions, lockedLeading = 1, }) {
    const [open, setOpen] = useState(false);
    const [order, setOrder] = useState(columns);
    const [lastCols, setLastCols] = useState(columns);
    const [error, setError] = useState(null);
    const [pending, start] = useTransition();
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
    function moveCol(index, dir) {
        setOrder((o) => moveColumn(o, index, dir, lock));
    }
    function save() {
        setError(null);
        start(async () => {
            try {
                await actions.onSave(order.map((c) => c.key));
                setOpen(false);
            }
            catch {
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
            }
            catch {
                setError("Could not reset the column order.");
            }
        });
    }
    const btn = "px-2.5 py-1 rounded text-xs font-semibold border border-fcr-line text-fcr-steel hover:border-fcr-red hover:text-fcr-red disabled:opacity-50";
    return (_jsxs("div", { className: "relative inline-block text-left", children: [_jsx("button", { type: "button", className: btn, onClick: () => setOpen((v) => !v), "aria-expanded": open, "aria-haspopup": "dialog", children: "Columns" }), open && (_jsxs("div", { role: "dialog", "aria-label": "Reorder columns", className: "absolute z-20 mt-1 w-64 rounded-lg border-2 border-fcr-line bg-white p-3 shadow-lg", children: [_jsx("p", { className: "mb-2 text-[10px] font-bold uppercase tracking-widest text-fcr-steel", children: "Reorder columns" }), _jsx("ul", { className: "max-h-72 space-y-0.5 overflow-y-auto", children: order.map((col, i) => {
                            const locked = i < lock;
                            return (_jsxs("li", { className: `flex items-center justify-between gap-2 rounded px-2 py-1 text-sm ${locked ? "text-fcr-steel/60" : "text-fcr-ink hover:bg-fcr-paper"}`, children: [_jsx("span", { className: "truncate", children: col.label }), locked ? (_jsx("span", { className: "shrink-0 text-[10px] uppercase tracking-wide text-fcr-steel/60", children: "pinned" })) : (_jsxs("span", { className: "shrink-0 flex gap-1", children: [_jsx("button", { type: "button", className: btn, disabled: pending || i <= lock, onClick: () => moveCol(i, -1), "aria-label": `Move ${col.label} earlier`, children: "\u2191" }), _jsx("button", { type: "button", className: btn, disabled: pending || i >= order.length - 1, onClick: () => moveCol(i, 1), "aria-label": `Move ${col.label} later`, children: "\u2193" })] }))] }, col.key));
                        }) }), error && _jsx("p", { className: "mt-2 text-[11px] leading-tight text-fcr-red", children: error }), _jsxs("div", { className: "mt-3 flex items-center justify-between gap-2", children: [_jsx("button", { type: "button", className: btn, disabled: pending, onClick: reset, children: "Reset to default" }), _jsx("button", { type: "button", className: "rounded bg-fcr-ink px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50", disabled: pending || !dirty, onClick: save, children: pending ? "Saving…" : "Save order" })] })] }))] }));
}
