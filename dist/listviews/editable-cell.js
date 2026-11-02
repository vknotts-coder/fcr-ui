"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Opt-in editable grid cell for the list-view surface (fcr-trailers epic #88 Track A). A single body cell
// that renders read-only until clicked, then becomes an inline input / dropdown; on commit it calls the
// INJECTED server action (`onCommit`) with optimistic update + revert-on-error. App-agnostic: @fcr/ui owns
// no write path, no column policy — the consumer injects `onCommit` (its gated per-cell server action) and
// decides which columns are editable (ListGrid's `editable` prop). Display formatting reuses the grid's own
// `renderCell`, so an edited value renders identically to every other cell. Commit on blur or Enter; Esc
// cancels. Mirrors the board's optimistic-write-then-reconcile pattern.
import { useState, useTransition } from "react";
import { renderCell, cellTd, cellTdNum, defaultFormatters } from "../cells.js";
const inputCls = "w-full min-w-[6rem] rounded border border-fcr-red/60 bg-white px-1.5 py-0.5 text-sm text-fcr-ink focus:outline-none focus:ring-1 focus:ring-fcr-red";
export function EditableCell({ rowId, col, spec, initialRaw, onCommit, }) {
    // Display formatting uses the built-in defaults — @fcr/ui's `fmt` is a set of FUNCTIONS, which a server
    // page cannot pass across the RSC boundary into this client component (cells.ts documents the same limit
    // for the client report grid). Every FCR app uses the defaults, so edited cells render identically.
    const fmt = defaultFormatters;
    const [editing, setEditing] = useState(false);
    const [raw, setRaw] = useState(initialRaw); // the committed/persisted value
    const [draft, setDraft] = useState(initialRaw); // the in-progress edit
    const [error, setError] = useState(null);
    const [pending, start] = useTransition();
    const tdCls = col.numeric ? cellTdNum : cellTd;
    const display = renderCell(raw === "" ? null : raw, col, fmt);
    function begin() {
        setDraft(raw);
        setError(null);
        setEditing(true);
    }
    function commit() {
        setEditing(false);
        if (draft === raw)
            return; // no-op: nothing to save
        const prev = raw;
        setRaw(draft); // optimistic
        setError(null);
        start(async () => {
            const res = await onCommit(rowId, col.key, draft);
            if (res.ok)
                setRaw(res.value ?? "");
            else {
                setRaw(prev); // revert
                setDraft(prev);
                setError(res.error);
            }
        });
    }
    if (!editing) {
        return (_jsxs("td", { className: tdCls, children: [_jsxs("button", { type: "button", onClick: begin, disabled: pending, title: error ?? "Click to edit", className: `-mx-1 w-full rounded px-1 py-0.5 ${col.numeric ? "text-right" : "text-left"} hover:bg-fcr-paper disabled:opacity-60 ${error ? "ring-1 ring-fcr-red" : ""}`, children: [_jsx("span", { children: display }), pending && _jsx("span", { className: "ml-1 text-fcr-steel", "aria-hidden": true, children: "\u2026" })] }), error && _jsx("span", { className: "mt-0.5 block text-[10px] leading-tight text-fcr-red", children: error })] }));
    }
    const onKeyDown = (e) => {
        if (e.key === "Enter" && spec.input !== "textarea") {
            e.preventDefault();
            commit();
        }
        else if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
            setDraft(raw);
        }
    };
    return (_jsx("td", { className: tdCls, children: spec.input === "select" ? (_jsx("select", { autoFocus: true, value: draft, onChange: (e) => setDraft(e.target.value), onBlur: commit, onKeyDown: onKeyDown, className: inputCls, children: (spec.options ?? []).map((o) => (_jsx("option", { value: o, children: o === "" ? "—" : o }, o))) })) : spec.input === "textarea" ? (_jsx("textarea", { autoFocus: true, rows: 2, value: draft, onChange: (e) => setDraft(e.target.value), onBlur: commit, onKeyDown: onKeyDown, className: inputCls })) : (_jsx("input", { autoFocus: true, type: spec.input === "number" ? "number" : spec.input === "date" ? "date" : "text", value: draft, onChange: (e) => setDraft(e.target.value), onBlur: commit, onKeyDown: onKeyDown, className: inputCls })) }));
}
