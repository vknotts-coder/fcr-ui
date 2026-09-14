"use client";

// Report builder (#43 Slice 2) — the Salesforce-style report designer, extracted into @fcr/ui. Client-side
// state is a per-field set of useState hooks; the assembled ReportDefinition is memoized. Run/Save/Delete
// invoke INJECTED server actions (the `actions` prop) via useTransition — the app's actions RE-VALIDATE
// against the caller's registry server-side, so this component is a convenience, never the security
// boundary. No sort UI and no multi-select `in` editor (both live in the validator only). CSV export POSTs
// to the app's `exportPath` (the app re-runs + re-validates the definition server-side).

import { useMemo, useState, useTransition } from "react";
import type {
  ClientReportObject,
  DateBucket,
  FilterOperator,
  ReportDefinition,
  ReportFieldMeta,
  ReportFilter,
  ReportGroupBy,
  ReportSummary,
  SummaryAgg,
} from "@fcr/core/reports/definition";
import { OPERATORS_BY_TYPE, VALUELESS_OPERATORS } from "@fcr/core/reports/definition";
import type { RunOutcome } from "@fcr/core/reports";
import { csvFilename } from "@fcr/core/reports/csv";
import ReportResults from "./report-results.js";
import { defaultFormatters, type CellFormatters } from "../cells.js";

// ── Injected app boundary ─────────────────────────────────────────────────────────────────────────
// The builder does not import app server actions (a shared package can't own Next server actions). The
// consumer wires its own — each re-gates + re-validates the definition server-side — and passes them in.

/** Result of a save action: the new/updated report id, or validation errors. */
export type SaveResult = { ok: true; id: string } | { ok: false; errors: string[] };

/** The server actions the builder invokes. Supplied by the consuming app (fcr-dispatch's
 *  src/app/reports/builder/actions.ts, etc.), never imported here. */
export type ReportBuilderActions = {
  runReport: (definition: unknown) => Promise<RunOutcome>;
  saveReport: (name: string, definition: unknown) => Promise<SaveResult>;
  deleteReport: (id: string) => Promise<void>;
};

// ── Shared styling (FCR tokens) ─────────────────────────────────────────────────────────────────────
// Explicit variant constants (not derived by String.replace on each other — a later utility rename would
// silently no-op the replace and yield a wrong variant). They intentionally share every utility except size.
const inputCls =
  "w-full px-3 py-2.5 text-base rounded border border-fcr-line bg-white focus:border-fcr-red focus:ring-2 focus:ring-fcr-red/20 outline-none";
const smInput =
  "w-full px-3 py-1.5 text-sm rounded border border-fcr-line bg-white focus:border-fcr-red focus:ring-2 focus:ring-fcr-red/20 outline-none";
const labelCls = "block text-xs uppercase tracking-widest font-bold text-fcr-steel mb-1";
const btnPrimary =
  "px-4 py-2.5 rounded bg-fcr-red text-white text-sm font-semibold uppercase tracking-wider hover:bg-fcr-red-dark disabled:opacity-40";
const btnSecondary =
  "px-3 py-2 rounded border border-fcr-ink text-fcr-ink text-sm font-semibold hover:bg-fcr-ink hover:text-white disabled:opacity-40";
const card = "bg-white border-2 border-fcr-line rounded-lg p-4";

const OP_LABELS: Record<FilterOperator, string> = {
  eq: "is",
  neq: "is not",
  contains: "contains",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  isNull: "is blank",
  notNull: "is not blank",
  in: "is any of",
};

const AGGS: SummaryAgg[] = ["count", "sum", "avg", "min", "max"];
const BUCKETS: DateBucket[] = ["day", "month", "year"];

// ── Filter value editor (type-aware) ─────────────────────────────────────────────────────────────────
function FilterValue({
  field,
  value,
  onChange,
}: {
  field: ReportFieldMeta;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "enum") {
    return (
      <select className={smInput} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {(field.enumValues ?? []).map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "boolean") {
    return (
      <select className={smInput} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }
  const inputType = field.type === "date" ? "date" : field.type === "number" || field.type === "money" ? "number" : "text";
  return <input type={inputType} className={smInput} value={value} onChange={(e) => onChange(e.target.value)} />;
}

// ── One filter row ──────────────────────────────────────────────────────────────────────────────────
function FilterRow({
  index,
  filter,
  fields,
  onChange,
  onRemove,
}: {
  index: number;
  filter: ReportFilter;
  fields: ReportFieldMeta[];
  onChange: (f: ReportFilter) => void;
  onRemove: () => void;
}) {
  const field = fields.find((f) => f.key === filter.field) ?? fields[0];
  const ops = field ? OPERATORS_BY_TYPE[field.type] : [];
  const valueStr = typeof filter.value === "string" ? filter.value : "";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-fcr-line bg-fcr-paper/40 p-2">
      <span className="text-xs font-bold text-fcr-steel w-5 shrink-0">{index + 1}</span>
      <select
        className={`${smInput} flex-1 min-w-[8rem]`}
        value={filter.field}
        onChange={(e) => {
          // New field ⇒ reset to its first legal operator and clear the value (a stale op/value may be illegal).
          const nf = fields.find((f) => f.key === e.target.value);
          const nextOp = (nf ? OPERATORS_BY_TYPE[nf.type][0] : undefined) ?? "eq";
          onChange({ field: e.target.value, op: nextOp, value: "" });
        }}
      >
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        className={`${smInput} w-28`}
        value={filter.op}
        onChange={(e) => {
          const op = e.target.value as FilterOperator;
          onChange({ ...filter, op, value: VALUELESS_OPERATORS.has(op) ? null : valueStr });
        }}
      >
        {ops.map((op) => (
          <option key={op} value={op}>
            {OP_LABELS[op]}
          </option>
        ))}
      </select>
      {!VALUELESS_OPERATORS.has(filter.op) && field && (
        <div className="w-40">
          <FilterValue field={field} value={valueStr} onChange={(v) => onChange({ ...filter, value: v })} />
        </div>
      )}
      <button type="button" onClick={onRemove} className="text-fcr-steel hover:text-fcr-red px-1" aria-label="Remove filter">
        ×
      </button>
    </div>
  );
}

// ── Main builder ──────────────────────────────────────────────────────────────────────────────────
export type ReportBuilderInitial = { objectKey: string; definition: ReportDefinition; name: string };

export default function ReportBuilder({
  objects,
  initial,
  savedReportId,
  actions,
  fmt = defaultFormatters,
  exportPath = "/reports/export",
}: {
  objects: ClientReportObject[];
  initial?: ReportBuilderInitial | null;
  savedReportId?: string | null;
  actions: ReportBuilderActions;
  fmt?: CellFormatters;
  exportPath?: string;
}) {
  const [objectKey, setObjectKey] = useState(initial?.objectKey ?? objects[0]?.key ?? "");
  const [columns, setColumns] = useState<string[]>(initial?.definition.columns ?? []);
  const [filters, setFilters] = useState<ReportFilter[]>(initial?.definition.filters ?? []);
  const [filterLogic, setFilterLogic] = useState<string>(initial?.definition.filterLogic ?? "");
  const [groupBy, setGroupBy] = useState<ReportGroupBy | null>(initial?.definition.groupBy ?? null);
  const [summaries, setSummaries] = useState<ReportSummary[]>(initial?.definition.summaries ?? []);
  const [name, setName] = useState(initial?.name ?? "");

  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  // Snapshot of the definition that produced `outcome` (set only on a successful run). The CSV Export button
  // submits THIS (the definition actually run), so an export always matches the current preview even if the
  // form is edited afterward; it also gates the Export button (disabled until a successful run exists).
  const [ranDefinition, setRanDefinition] = useState<ReportDefinition | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const [pending, startRun] = useTransition();
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [exporting, startExport] = useTransition();

  const obj = useMemo(() => objects.find((o) => o.key === objectKey) ?? null, [objects, objectKey]);
  const fields = obj?.fields ?? [];
  const filterableFields = useMemo(() => fields.filter((f) => f.filterable), [fields]);
  const groupableFields = useMemo(() => fields.filter((f) => f.groupable), [fields]);
  const summableFields = useMemo(() => fields.filter((f) => f.summable), [fields]);
  const isSummary = summaries.length > 0;

  const definition: ReportDefinition = useMemo(
    () => ({
      object: objectKey,
      columns: isSummary ? [] : columns,
      filters,
      // filterLogic is meaningful only at ≥2 filters; never submit a stale value the user can't see.
      filterLogic: filters.length >= 2 ? filterLogic.trim() || null : null,
      groupBy: isSummary ? groupBy : null,
      summaries,
      sort: null, // no sort UI in v1 (validator supports it)
    }),
    [objectKey, columns, filters, filterLogic, groupBy, summaries, isSummary],
  );

  function pickObject(key: string) {
    setObjectKey(key);
    setColumns([]);
    setFilters([]);
    setFilterLogic("");
    setGroupBy(null);
    setSummaries([]);
    setOutcome(null);
    setRanDefinition(null);
    setSaveMsg(null);
  }

  function toggleColumn(key: string) {
    setColumns((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  function addFilter() {
    const f0 = filterableFields[0];
    if (!f0) return;
    setFilters((cur) => [...cur, { field: f0.key, op: OPERATORS_BY_TYPE[f0.type][0] ?? "eq", value: "" }]);
  }
  function updateFilter(i: number, f: ReportFilter) {
    setFilters((cur) => cur.map((x, idx) => (idx === i ? f : x)));
  }
  function removeFilter(i: number) {
    // Renumbering would change what a numeric filterLogic refers to — clear it to avoid silent drift.
    setFilters((cur) => cur.filter((_, idx) => idx !== i));
    setFilterLogic("");
  }

  function addSummary() {
    setSummaries((cur) => [...cur, { field: "*", agg: "count" }]);
  }
  function updateSummary(i: number, s: ReportSummary) {
    setSummaries((cur) => cur.map((x, idx) => (idx === i ? s : x)));
  }
  function removeSummary(i: number) {
    setSummaries((cur) => cur.filter((_, idx) => idx !== i));
  }

  function run() {
    setSaveMsg(null);
    setExportMsg(null);
    startRun(async () => {
      const o = await actions.runReport(definition);
      setOutcome(o);
      setRanDefinition(o.ok ? definition : null);
    });
  }
  // CSV export via fetch()+Blob (NOT a full-page form POST): a 400 / 404 / auth-redirect surfaces inline via
  // exportMsg instead of navigating the browser away and destroying the builder's unsaved report state. The
  // route re-runs + re-validates the definition server-side, so this is a delivery mechanism only.
  function exportCsv() {
    if (!ranDefinition) return;
    setExportMsg(null);
    startExport(async () => {
      try {
        const body = new FormData();
        body.set("definition", JSON.stringify(ranDefinition));
        body.set("name", name.trim() || "report");
        const res = await fetch(exportPath, { method: "POST", body });
        const ct = res.headers.get("content-type") ?? "";
        if (!res.ok || !ct.includes("text/csv")) {
          // A followed auth-redirect lands on an HTML page; a 400 returns a plain-text reason.
          if (res.redirected || ct.includes("text/html")) {
            setExportMsg("Export failed — your session may have expired. Reload and sign in.");
          } else {
            const txt = await res.text().catch(() => "");
            setExportMsg(txt.slice(0, 200) || `Export failed (${res.status}).`);
          }
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = csvFilename(name.trim() || "report");
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        setExportMsg("Export failed — network error.");
      }
    });
  }
  function save() {
    startSave(async () => {
      const r = await actions.saveReport(name, definition);
      setSaveMsg(r.ok ? "Saved." : r.errors.join("; "));
    });
  }
  function remove() {
    if (!savedReportId) return;
    startDelete(async () => {
      await actions.deleteReport(savedReportId);
    });
  }

  const groupField = groupBy ? fields.find((f) => f.key === groupBy.field) ?? null : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Left: the builder ── */}
      <div className="space-y-4">
        {/* Object picker */}
        <div className={card}>
          <label className={labelCls} htmlFor="rb-object">
            Report on
          </label>
          <select id="rb-object" className={inputCls} value={objectKey} onChange={(e) => pickObject(e.target.value)}>
            {objects.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {obj?.description && <p className="mt-1 text-xs text-fcr-steel">{obj.description}</p>}
        </div>

        {/* Columns (hidden in summary mode) */}
        {!isSummary && (
          <div className={card}>
            <div className="flex items-center justify-between mb-2">
              <span className={labelCls + " mb-0"}>Columns</span>
              <span className="text-xs text-fcr-steel">{columns.length} selected</span>
            </div>
            <div className="max-h-56 overflow-y-auto grid sm:grid-cols-2 gap-1">
              {fields.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-fcr-ink cursor-pointer">
                  <input type="checkbox" checked={columns.includes(f.key)} onChange={() => toggleColumn(f.key)} />
                  <span>{f.label}</span>
                  <span className="text-[10px] uppercase tracking-widest text-fcr-steel">{f.type}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={card}>
          <div className="flex items-center justify-between mb-2">
            <span className={labelCls + " mb-0"}>Filters</span>
            <button type="button" onClick={addFilter} className={btnSecondary}>
              + Filter
            </button>
          </div>
          {filters.length === 0 ? (
            <p className="text-xs text-fcr-steel">No filters — the report returns all rows (up to the cap).</p>
          ) : (
            <div className="space-y-2">
              {filters.map((f, i) => (
                <FilterRow
                  key={i}
                  index={i}
                  filter={f}
                  fields={filterableFields}
                  onChange={(nf) => updateFilter(i, nf)}
                  onRemove={() => removeFilter(i)}
                />
              ))}
            </div>
          )}
          {filters.length >= 2 && (
            <div className="mt-3">
              <label className={labelCls} htmlFor="rb-logic">
                Filter logic
              </label>
              <input
                id="rb-logic"
                className={smInput}
                value={filterLogic}
                onChange={(e) => setFilterLogic(e.target.value)}
                placeholder="1 AND (2 OR 3)"
              />
              <p className="mt-1 text-[11px] text-fcr-steel">AND / OR / NOT and parentheses. Blank = all filters AND'd.</p>
            </div>
          )}
        </div>

        {/* Summarize */}
        <div className={card}>
          <span className={labelCls}>Summarize (optional)</span>
          <div className="mb-3">
            <label className="text-xs text-fcr-steel">Group by</label>
            <div className="flex gap-2">
              <select
                className={smInput}
                value={groupBy?.field ?? ""}
                onChange={(e) =>
                  setGroupBy(e.target.value ? { field: e.target.value } : null)
                }
              >
                <option value="">— none —</option>
                {groupableFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
              {groupBy && groupField?.type === "date" && (
                <select
                  className={`${smInput} w-28`}
                  value={groupBy.bucket ?? "day"}
                  onChange={(e) => setGroupBy({ field: groupBy.field, bucket: e.target.value as DateBucket })}
                >
                  {BUCKETS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-fcr-steel">Summaries</span>
            <button type="button" onClick={addSummary} className={btnSecondary}>
              + Summary
            </button>
          </div>
          {summaries.length === 0 ? (
            <p className="text-xs text-fcr-steel">Add a summary (count/sum/avg…) to switch to a grouped report.</p>
          ) : (
            <div className="space-y-2">
              {summaries.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    className={`${smInput} w-28`}
                    value={s.agg}
                    onChange={(e) => {
                      const agg = e.target.value as SummaryAgg;
                      updateSummary(i, { agg, field: agg === "count" ? "*" : summableFields[0]?.key ?? "*" });
                    }}
                  >
                    {AGGS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  {s.agg === "count" ? (
                    <span className="text-sm text-fcr-steel">of rows</span>
                  ) : (
                    <select
                      className={`${smInput} flex-1 min-w-[8rem]`}
                      value={s.field}
                      onChange={(e) => updateSummary(i, { ...s, field: e.target.value })}
                    >
                      {summableFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <button type="button" onClick={() => removeSummary(i)} className="text-fcr-steel hover:text-fcr-red px-1" aria-label="Remove summary">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`${card} space-y-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={run} disabled={pending || !objectKey} className={btnPrimary}>
              {pending ? "Running…" : "Run report"}
            </button>
            {/* Exports the definition that was actually RUN (ranDefinition), so the CSV matches the preview
                even if the form is edited afterward. fetch()+Blob download; disabled until a successful run. */}
            <button type="button" onClick={exportCsv} disabled={exporting || !ranDefinition} className={btnSecondary}>
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
          {!ranDefinition && <p className="text-xs text-fcr-steel">Run the report to enable CSV export.</p>}
          {exportMsg && <p className="text-sm text-fcr-red">{exportMsg}</p>}

          <div className="border-t border-fcr-line pt-3">
            <label className={labelCls} htmlFor="rb-name">
              Save as
            </label>
            <div className="flex gap-2">
              <input id="rb-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Report name" />
              <button type="button" onClick={save} disabled={saving || !name.trim()} className={btnPrimary}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            {saveMsg && <p className="mt-1 text-sm text-fcr-steel">{saveMsg}</p>}
          </div>

          {savedReportId && (
            <div className="border-t border-fcr-line pt-3">
              <button type="button" onClick={remove} disabled={deleting} className={btnSecondary}>
                {deleting ? "Deleting…" : "Delete report"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: results ── */}
      <div>
        {outcome ? (
          <ReportResults outcome={outcome} fmt={fmt} />
        ) : (
          <div className="rounded-lg border-2 border-dashed border-fcr-line p-8 text-center text-sm text-fcr-steel">
            Configure the report and press <span className="font-semibold">Run report</span> to preview results.
          </div>
        )}
      </div>
    </div>
  );
}
