"use client";

// Per-user collapsible + rearrangeable record-page sections (epic fcr-trailers#103 S2). App-agnostic: the
// consuming app server-renders each section's BODY and passes it as `children`, in the order @fcr/core's
// `resolveSections` already resolved (pinned section first, saved order applied, initial collapsed flags),
// plus a gated `onSave` server action. This component owns ONLY the interactive layout + persistence call.
//
// Reorder is move up/down buttons, not drag — accessible and touch-friendly with no new dependency (the same
// choice ColumnControl made). The pinned section (e.g. "information") is forced first and not movable, but IS
// collapsible — only its position is fixed.
//
// Persistence is a pure DISPLAY preference, so `onSave` does NOT revalidate: the client already shows the new
// arrangement optimistically, and re-rendering the page would only reset this state. The saved pref is read
// back on the next full load. Each change persists immediately (moves are infrequent and the upsert is
// idempotent); a failed save keeps the optimistic UI and surfaces a non-blocking notice.

import { useState, useTransition, type ReactNode } from "react";
import {
  moveSection,
  toggleCollapsed,
  serializeSections,
  reconcileSections,
  type SectionMeta,
} from "./section-state.js";

/** One section to render: its key, heading, initial collapsed state, and server-rendered body. */
export type SectionItem = { key: string; title: string; collapsed: boolean; children: ReactNode };

export type RecordSectionsActions = {
  /** Persist the viewer's section arrangement ({ order, collapsed }). Does NOT revalidate (display pref). */
  onSave: (pref: { order: string[]; collapsed: string[] }) => Promise<void>;
};

export function RecordSections({
  sections,
  actions,
  pinnedKey,
}: {
  /** Sections in resolved render order (pinned first), each with its initial collapsed flag + body. */
  sections: SectionItem[];
  actions: RecordSectionsActions;
  /** The section pinned first + not reorderable (still collapsible). Usually "information". */
  pinnedKey?: string;
}) {
  const [metas, setMetas] = useState<SectionMeta[]>(() =>
    sections.map((s) => ({ key: s.key, collapsed: s.collapsed })),
  );
  const [seedKeys, setSeedKeys] = useState(() => sections.map((s) => s.key).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Re-seed if the page's section set changes under us (a registry change on a long-open tab) — keep the
  // user's order/collapsed for surviving sections, append new ones expanded, drop gone ones, re-pin. Only
  // while no save is in flight, so an in-progress optimistic edit is never clobbered.
  const propKeys = sections.map((s) => s.key).join("\n");
  if (propKeys !== seedKeys && !pending) {
    setSeedKeys(propKeys);
    setMetas((m) => reconcileSections(m, sections.map((s) => s.key), pinnedKey));
  }

  const byKey = new Map(sections.map((s) => [s.key, s]));
  const lock = pinnedKey && metas[0]?.key === pinnedKey ? 1 : 0;

  function persist(next: SectionMeta[]) {
    setMetas(next);
    start(async () => {
      try {
        await actions.onSave(serializeSections(next));
        setError(null);
      } catch {
        setError("Couldn't save your layout — it'll reset on reload.");
      }
    });
  }

  const moveBtn =
    "px-2 py-0.5 rounded text-xs font-semibold border border-fcr-line text-fcr-steel hover:border-fcr-red hover:text-fcr-red disabled:opacity-40 disabled:hover:border-fcr-line disabled:hover:text-fcr-steel";

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="text-[11px] leading-tight text-fcr-red">
          {error}
        </p>
      )}
      {metas.map((m, i) => {
        const s = byKey.get(m.key);
        if (!s) return null; // key not in current props (reconcile will drop it next render)
        const locked = i < lock;
        const bodyId = `record-section-${m.key}`;
        return (
          <section
            key={m.key}
            className="overflow-hidden rounded-2xl border border-fcr-line bg-white shadow-sm"
          >
            <div className="flex items-center gap-2 border-b border-fcr-line/60 px-4 py-3">
              <button
                type="button"
                onClick={() => persist(toggleCollapsed(metas, i))}
                aria-expanded={!m.collapsed}
                aria-controls={bodyId}
                aria-label={m.collapsed ? `Expand ${s.title}` : `Collapse ${s.title}`}
                className="shrink-0 text-fcr-steel hover:text-fcr-ink"
              >
                <span aria-hidden className="inline-block w-3 text-xs">
                  {m.collapsed ? "▸" : "▾"}
                </span>
              </button>
              <h2 className="flex-1 truncate text-sm font-bold uppercase tracking-wide text-fcr-ink">
                {s.title}
              </h2>
              {locked ? (
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-fcr-steel/60">pinned</span>
              ) : (
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className={moveBtn}
                    disabled={pending || i <= lock}
                    onClick={() => persist(moveSection(metas, i, -1, lock))}
                    aria-label={`Move ${s.title} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={moveBtn}
                    disabled={pending || i >= metas.length - 1}
                    onClick={() => persist(moveSection(metas, i, 1, lock))}
                    aria-label={`Move ${s.title} down`}
                  >
                    ↓
                  </button>
                </span>
              )}
            </div>
            {!m.collapsed && (
              <div id={bodyId} className="p-4">
                {s.children}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
