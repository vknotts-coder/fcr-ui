"use client";

// Opt-in editable grid cell for the list-view surface (fcr-trailers epic #88 Track A). A single body cell
// that renders read-only until clicked, then becomes an inline input / dropdown; on commit it calls the
// INJECTED server action (`onCommit`) with optimistic update + revert-on-error. App-agnostic: @fcr/ui owns
// no write path, no column policy — the consumer injects `onCommit` (its gated per-cell server action) and
// decides which columns are editable (ListGrid's `editable` prop). Display formatting reuses the grid's own
// `renderCell`, so an edited value renders identically to every other cell. Commit on blur or Enter; Esc
// cancels. Mirrors the board's optimistic-write-then-reconcile pattern.

import { useState, useTransition } from "react";
import type { ReportColumn } from "@fcr/core/reports";
import { renderCell, cellTd, cellTdNum, defaultFormatters } from "../cells.js";

/** Per-column input descriptor the consumer supplies (from its editable field defs). */
export type EditInput = {
  input: "text" | "textarea" | "date" | "number" | "select";
  /** Options for a `select` (include a leading "" for "clear"); ignored otherwise. */
  options?: string[];
};

/** The injected commit action. Returns the PERSISTED raw value (the server may normalize/derive it) or an
 *  error to surface. Shape matches fcr-trailers' setTrailerFieldAction. */
export type EditCommit = (
  rowId: string,
  column: string,
  value: string,
) => Promise<{ ok: true; value: string | null } | { ok: false; error: string }>;

const inputCls =
  "w-full min-w-[6rem] rounded border border-fcr-red/60 bg-white px-1.5 py-0.5 text-sm text-fcr-ink focus:outline-none focus:ring-1 focus:ring-fcr-red";

export function EditableCell({
  rowId,
  col,
  spec,
  initialRaw,
  onCommit,
}: {
  rowId: string;
  col: ReportColumn;
  spec: EditInput;
  /** Raw current value for the input ("" = blank). For a date this is the YYYY-MM-DD calendar string. */
  initialRaw: string;
  onCommit: EditCommit;
}) {
  // Display formatting uses the built-in defaults — @fcr/ui's `fmt` is a set of FUNCTIONS, which a server
  // page cannot pass across the RSC boundary into this client component (cells.ts documents the same limit
  // for the client report grid). Every FCR app uses the defaults, so edited cells render identically.
  const fmt = defaultFormatters;
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(initialRaw); // the committed/persisted value
  const [draft, setDraft] = useState(initialRaw); // the in-progress edit
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Re-sync to a changed server value. If the grid ever reuses this cell instance when its underlying row
  // value changes (a re-query, a concurrent edit, or a sort if the row key weren't stable), `initialRaw`
  // changes under a still-mounted cell — and `useState(initialRaw)` only reads its arg on mount, so without
  // this the cell would keep showing the prior value (the frozen-column bug, #88 revert 2026-11-03). Track
  // the last-seen prop and re-sync whenever it changes AND we're not mid-edit (don't clobber a live edit).
  // React's "store information from previous renders" pattern — synchronous, no effect. Belt-and-suspenders
  // with ListGrid's stable row key, which already keeps a cell with its own row across a re-sort.
  const [lastInit, setLastInit] = useState(initialRaw);
  // Re-sync to a changed server value, but ONLY when idle — not editing and not mid-commit. Gating BOTH the
  // `lastInit` advance AND the adoption on the same condition is what makes this correct: a server change
  // that lands while the cell is being edited/committed is HELD (lastInit stays put) and then adopted on the
  // first idle render after the edit ends; and the optimistic value set by commit() (editing=false but the
  // server action still `pending`) is never clobbered mid-flight. Advancing lastInit unconditionally would
  // instead record the change without adopting it, dropping it permanently. React's "store info from a
  // previous render" pattern — synchronous and converging (next render's inequality is false).
  if (initialRaw !== lastInit && !editing && !pending) {
    setLastInit(initialRaw);
    setRaw(initialRaw);
    setDraft(initialRaw);
    setError(null);
  }

  const tdCls = col.numeric ? cellTdNum : cellTd;
  const display = renderCell(raw === "" ? null : raw, col, fmt);

  function begin() {
    setDraft(raw);
    setError(null);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (draft === raw) return; // no-op: nothing to save
    const prev = raw;
    setRaw(draft); // optimistic
    setError(null);
    start(async () => {
      const res = await onCommit(rowId, col.key, draft);
      if (res.ok) setRaw(res.value ?? "");
      else {
        setRaw(prev); // revert
        setDraft(prev);
        setError(res.error);
      }
    });
  }

  if (!editing) {
    return (
      <td className={tdCls}>
        <button
          type="button"
          onClick={begin}
          disabled={pending}
          title={error ?? "Click to edit"}
          className={`-mx-1 w-full rounded px-1 py-0.5 ${col.numeric ? "text-right" : "text-left"} hover:bg-fcr-paper disabled:opacity-60 ${error ? "ring-1 ring-fcr-red" : ""}`}
        >
          <span>{display}</span>
          {pending && <span className="ml-1 text-fcr-steel" aria-hidden>…</span>}
        </button>
        {error && <span className="mt-0.5 block text-[10px] leading-tight text-fcr-red">{error}</span>}
      </td>
    );
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && spec.input !== "textarea") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
      setDraft(raw);
    }
  };

  return (
    <td className={tdCls}>
      {spec.input === "select" ? (
        <select
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className={inputCls}
        >
          {(spec.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o === "" ? "—" : o}
            </option>
          ))}
        </select>
      ) : spec.input === "textarea" ? (
        <textarea
          autoFocus
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className={inputCls}
        />
      ) : (
        <input
          autoFocus
          type={spec.input === "number" ? "number" : spec.input === "date" ? "date" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className={inputCls}
        />
      )}
    </td>
  );
}
