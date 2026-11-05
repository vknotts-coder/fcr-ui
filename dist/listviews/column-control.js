"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Per-user column SHOW/HIDE + REORDER control for the list-view surface (Track C, epic fcr-dispatch#402).
// The superset of ColumnOrderControl (#88 Track B, which is reorder-only and kept for back-compat): this
// one also lets a user turn columns off and back on. App-agnostic — @fcr/ui owns no persistence; the
// consumer injects `onSave` (its gated server action → @fcr/core saveListViewPref with the { order, hidden }
// arrangement) and `onReset` (→ deleteListViewPref), both of which revalidate so the grid re-renders.
//
// The FIRST `lockedLeading` columns are PINNED (default 1): the ListGrid makes column index 0 the navigable
// record link, so that column must stay first AND visible — the control neither moves it, lets another
// column move above it, nor lets it be hidden; `onSave` always receives the locked leaders first and unhidden.
//
// Move up/down (buttons, not drag — accessible, and robust where a drag + the header's sort-click would
// fight). A checkbox per non-locked column toggles visibility. A safety rail forbids hiding the LAST visible
// column so the grid is never empty (the @fcr/core read-side has the same net, but the UI shouldn't offer it).
import { useEffect, useRef, useState, useTransition } from "react";
import { moveColumn, toggleHidden, reconcileArrangement, serializeArrangement, sameArrangement, } from "./column-order.js";
export function ColumnControl({ columns, actions, lockedLeading = 1, }) {
    const [open, setOpen] = useState(false);
    const [order, setOrder] = useState(columns);
    const [lastCols, setLastCols] = useState(columns);
    const [error, setError] = useState(null);
    const [pending, start] = useTransition();
    const rootRef = useRef(null);
    // Popover dismissal: Escape and an outside pointer-down close the panel (only while open).
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => {
            if (e.key === "Escape")
                setOpen(false);
        };
        const onDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("pointerdown", onDown);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("pointerdown", onDown);
        };
    }, [open]);
    // Re-sync the working arrangement when the view's columns change under us (a save revalidated, or the user
    // switched views) — but ONLY while the panel is closed and no save is in flight, so we never clobber an
    // in-progress edit or a just-saved optimistic state (the inline-edit re-sync lesson, #88 Track A).
    if (!sameArrangement(columns, lastCols) && !open && !pending) {
        setLastCols(columns);
        setOrder(columns);
        setError(null);
    }
    const lock = Math.min(Math.max(0, lockedLeading), order.length);
    const dirty = !sameArrangement(order, columns);
    const visibleCount = order.filter((c) => !c.hidden).length;
    function moveCol(index, dir) {
        setOrder((o) => moveColumn(o, index, dir, lock));
    }
    function toggleCol(index) {
        setOrder((o) => toggleHidden(o, index, lock));
    }
    function save() {
        setError(null);
        // Reconcile against the LIVE columns before persisting: if `columns` drifted while the panel was open,
        // drop any gone key and append any new column (visible) — so the stored arrangement is never stale.
        const reconciled = reconcileArrangement(order, columns);
        setOrder(reconciled);
        start(async () => {
            try {
                await actions.onSave(serializeArrangement(reconciled));
                setOpen(false);
            }
            catch {
                setError("Could not save the columns.");
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
                setError("Could not reset the columns.");
            }
        });
    }
    const btn = "px-2.5 py-1 rounded text-xs font-semibold border border-fcr-line text-fcr-steel hover:border-fcr-red hover:text-fcr-red disabled:opacity-50";
    return (_jsxs("div", { ref: rootRef, className: "relative inline-block text-left", children: [_jsx("button", { type: "button", className: btn, onClick: () => setOpen((v) => !v), "aria-expanded": open, children: "Columns" }), open && (_jsxs("div", { role: "group", "aria-label": "Show, hide and reorder columns", className: "absolute z-20 mt-1 w-72 rounded-lg border-2 border-fcr-line bg-white p-3 shadow-lg", children: [_jsx("p", { className: "mb-2 text-[10px] font-bold uppercase tracking-widest text-fcr-steel", children: "Show, hide & reorder columns" }), _jsx("ul", { className: "max-h-72 space-y-0.5 overflow-y-auto", children: order.map((col, i) => {
                            const locked = i < lock;
                            // Forbid hiding the last visible column (empty grid). Locked leaders are always visible.
                            const blockHide = !col.hidden && visibleCount <= 1;
                            return (_jsxs("li", { className: `flex items-center justify-between gap-2 rounded px-2 py-1 text-sm ${locked ? "text-fcr-steel/60" : col.hidden ? "text-fcr-steel/50" : "text-fcr-ink hover:bg-fcr-paper"}`, children: [_jsxs("label", { className: "flex min-w-0 items-center gap-2", children: [locked ? (_jsx("span", { className: "inline-block h-3.5 w-3.5 shrink-0", "aria-hidden": true })) : (_jsx("input", { type: "checkbox", className: "h-3.5 w-3.5 shrink-0 accent-fcr-red", checked: !col.hidden, disabled: pending || blockHide, onChange: () => toggleCol(i), "aria-label": col.hidden ? `Show ${col.label}` : `Hide ${col.label}` })), _jsx("span", { className: "truncate", children: col.label })] }), locked ? (_jsx("span", { className: "shrink-0 text-[10px] uppercase tracking-wide text-fcr-steel/60", children: "pinned" })) : (_jsxs("span", { className: "shrink-0 flex gap-1", children: [_jsx("button", { type: "button", className: btn, disabled: pending || i <= lock, onClick: () => moveCol(i, -1), "aria-label": `Move ${col.label} earlier`, children: "\u2191" }), _jsx("button", { type: "button", className: btn, disabled: pending || i >= order.length - 1, onClick: () => moveCol(i, 1), "aria-label": `Move ${col.label} later`, children: "\u2193" })] }))] }, col.key));
                        }) }), error && _jsx("p", { className: "mt-2 text-[11px] leading-tight text-fcr-red", children: error }), _jsxs("div", { className: "mt-3 flex items-center justify-between gap-2", children: [_jsx("button", { type: "button", className: btn, disabled: pending, onClick: reset, children: "Reset to default" }), _jsx("button", { type: "button", className: "rounded bg-fcr-ink px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50", disabled: pending || !dirty, onClick: save, children: pending ? "Saving…" : "Save columns" })] })] }))] }));
}
