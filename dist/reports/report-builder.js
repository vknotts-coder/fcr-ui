"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Report builder (#43 Slice 2) — the Salesforce-style report designer, extracted into @fcr/ui. Client-side
// state is a per-field set of useState hooks; the assembled ReportDefinition is memoized. Run/Save/Delete
// invoke INJECTED server actions (the `actions` prop) via useTransition — the app's actions RE-VALIDATE
// against the caller's registry server-side, so this component is a convenience, never the security
// boundary. No sort UI and no multi-select `in` editor (both live in the validator only). CSV export POSTs
// to the app's `exportPath` (the app re-runs + re-validates the definition server-side).
import { useMemo, useState, useTransition } from "react";
import { OPERATORS_BY_TYPE, VALUELESS_OPERATORS } from "@fcr/core/reports/definition";
import { csvFilename } from "@fcr/core/reports/csv";
import ReportResults from "./report-results.js";
import { defaultFormatters } from "../cells.js";
// ── Shared styling (FCR tokens) ─────────────────────────────────────────────────────────────────────
// Explicit variant constants (not derived by String.replace on each other — a later utility rename would
// silently no-op the replace and yield a wrong variant). They intentionally share every utility except size.
const inputCls = "w-full px-3 py-2.5 text-base rounded border border-fcr-line bg-white focus:border-fcr-red focus:ring-2 focus:ring-fcr-red/20 outline-none";
const smInput = "w-full px-3 py-1.5 text-sm rounded border border-fcr-line bg-white focus:border-fcr-red focus:ring-2 focus:ring-fcr-red/20 outline-none";
const labelCls = "block text-xs uppercase tracking-widest font-bold text-fcr-steel mb-1";
const btnPrimary = "px-4 py-2.5 rounded bg-fcr-red text-white text-sm font-semibold uppercase tracking-wider hover:bg-fcr-red-dark disabled:opacity-40";
const btnSecondary = "px-3 py-2 rounded border border-fcr-ink text-fcr-ink text-sm font-semibold hover:bg-fcr-ink hover:text-white disabled:opacity-40";
const card = "bg-white border-2 border-fcr-line rounded-lg p-4";
const OP_LABELS = {
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
const AGGS = ["count", "sum", "avg", "min", "max"];
const BUCKETS = ["day", "month", "year"];
// ── Filter value editor (type-aware) ─────────────────────────────────────────────────────────────────
function FilterValue({ field, value, onChange, }) {
    if (field.type === "enum") {
        return (_jsxs("select", { className: smInput, value: value, onChange: (e) => onChange(e.target.value), children: [_jsx("option", { value: "", children: "\u2014 select \u2014" }), (field.enumValues ?? []).map((v) => (_jsx("option", { value: v, children: v }, v)))] }));
    }
    if (field.type === "boolean") {
        return (_jsxs("select", { className: smInput, value: value, onChange: (e) => onChange(e.target.value), children: [_jsx("option", { value: "", children: "\u2014 select \u2014" }), _jsx("option", { value: "true", children: "True" }), _jsx("option", { value: "false", children: "False" })] }));
    }
    const inputType = field.type === "date" ? "date" : field.type === "number" || field.type === "money" ? "number" : "text";
    return _jsx("input", { type: inputType, className: smInput, value: value, onChange: (e) => onChange(e.target.value) });
}
// ── One filter row ──────────────────────────────────────────────────────────────────────────────────
function FilterRow({ index, filter, fields, onChange, onRemove, }) {
    const field = fields.find((f) => f.key === filter.field) ?? fields[0];
    const ops = field ? OPERATORS_BY_TYPE[field.type] : [];
    const valueStr = typeof filter.value === "string" ? filter.value : "";
    return (_jsxs("div", { className: "flex flex-wrap items-center gap-2 rounded border border-fcr-line bg-fcr-paper/40 p-2", children: [_jsx("span", { className: "text-xs font-bold text-fcr-steel w-5 shrink-0", children: index + 1 }), _jsx("select", { className: `${smInput} flex-1 min-w-[8rem]`, value: filter.field, onChange: (e) => {
                    // New field ⇒ reset to its first legal operator and clear the value (a stale op/value may be illegal).
                    const nf = fields.find((f) => f.key === e.target.value);
                    const nextOp = (nf ? OPERATORS_BY_TYPE[nf.type][0] : undefined) ?? "eq";
                    onChange({ field: e.target.value, op: nextOp, value: "" });
                }, children: fields.map((f) => (_jsx("option", { value: f.key, children: f.label }, f.key))) }), _jsx("select", { className: `${smInput} w-28`, value: filter.op, onChange: (e) => {
                    const op = e.target.value;
                    onChange({ ...filter, op, value: VALUELESS_OPERATORS.has(op) ? null : valueStr });
                }, children: ops.map((op) => (_jsx("option", { value: op, children: OP_LABELS[op] }, op))) }), !VALUELESS_OPERATORS.has(filter.op) && field && (_jsx("div", { className: "w-40", children: _jsx(FilterValue, { field: field, value: valueStr, onChange: (v) => onChange({ ...filter, value: v }) }) })), _jsx("button", { type: "button", onClick: onRemove, className: "text-fcr-steel hover:text-fcr-red px-1", "aria-label": "Remove filter", children: "\u00D7" })] }));
}
export default function ReportBuilder({ objects, initial, savedReportId, actions, fmt = defaultFormatters, exportPath = "/reports/export", }) {
    const [objectKey, setObjectKey] = useState(initial?.objectKey ?? objects[0]?.key ?? "");
    const [columns, setColumns] = useState(initial?.definition.columns ?? []);
    const [filters, setFilters] = useState(initial?.definition.filters ?? []);
    const [filterLogic, setFilterLogic] = useState(initial?.definition.filterLogic ?? "");
    const [groupBy, setGroupBy] = useState(initial?.definition.groupBy ?? null);
    const [summaries, setSummaries] = useState(initial?.definition.summaries ?? []);
    const [name, setName] = useState(initial?.name ?? "");
    const [outcome, setOutcome] = useState(null);
    // Snapshot of the definition that produced `outcome` (set only on a successful run). The CSV Export button
    // submits THIS (the definition actually run), so an export always matches the current preview even if the
    // form is edited afterward; it also gates the Export button (disabled until a successful run exists).
    const [ranDefinition, setRanDefinition] = useState(null);
    const [saveMsg, setSaveMsg] = useState(null);
    const [exportMsg, setExportMsg] = useState(null);
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
    const definition = useMemo(() => ({
        object: objectKey,
        columns: isSummary ? [] : columns,
        filters,
        // filterLogic is meaningful only at ≥2 filters; never submit a stale value the user can't see.
        filterLogic: filters.length >= 2 ? filterLogic.trim() || null : null,
        groupBy: isSummary ? groupBy : null,
        summaries,
        sort: null, // no sort UI in v1 (validator supports it)
    }), [objectKey, columns, filters, filterLogic, groupBy, summaries, isSummary]);
    function pickObject(key) {
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
    function toggleColumn(key) {
        setColumns((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
    }
    function addFilter() {
        const f0 = filterableFields[0];
        if (!f0)
            return;
        setFilters((cur) => [...cur, { field: f0.key, op: OPERATORS_BY_TYPE[f0.type][0] ?? "eq", value: "" }]);
    }
    function updateFilter(i, f) {
        setFilters((cur) => cur.map((x, idx) => (idx === i ? f : x)));
    }
    function removeFilter(i) {
        // Renumbering would change what a numeric filterLogic refers to — clear it to avoid silent drift.
        setFilters((cur) => cur.filter((_, idx) => idx !== i));
        setFilterLogic("");
    }
    function addSummary() {
        setSummaries((cur) => [...cur, { field: "*", agg: "count" }]);
    }
    function updateSummary(i, s) {
        setSummaries((cur) => cur.map((x, idx) => (idx === i ? s : x)));
    }
    function removeSummary(i) {
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
        if (!ranDefinition)
            return;
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
                    }
                    else {
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
            }
            catch {
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
        if (!savedReportId)
            return;
        startDelete(async () => {
            await actions.deleteReport(savedReportId);
        });
    }
    const groupField = groupBy ? fields.find((f) => f.key === groupBy.field) ?? null : null;
    return (_jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: card, children: [_jsx("label", { className: labelCls, htmlFor: "rb-object", children: "Report on" }), _jsx("select", { id: "rb-object", className: inputCls, value: objectKey, onChange: (e) => pickObject(e.target.value), children: objects.map((o) => (_jsx("option", { value: o.key, children: o.label }, o.key))) }), obj?.description && _jsx("p", { className: "mt-1 text-xs text-fcr-steel", children: obj.description })] }), !isSummary && (_jsxs("div", { className: card, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: labelCls + " mb-0", children: "Columns" }), _jsxs("span", { className: "text-xs text-fcr-steel", children: [columns.length, " selected"] })] }), _jsx("div", { className: "max-h-56 overflow-y-auto grid sm:grid-cols-2 gap-1", children: fields.map((f) => (_jsxs("label", { className: "flex items-center gap-2 text-sm text-fcr-ink cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: columns.includes(f.key), onChange: () => toggleColumn(f.key) }), _jsx("span", { children: f.label }), _jsx("span", { className: "text-[10px] uppercase tracking-widest text-fcr-steel", children: f.type })] }, f.key))) })] })), _jsxs("div", { className: card, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: labelCls + " mb-0", children: "Filters" }), _jsx("button", { type: "button", onClick: addFilter, className: btnSecondary, children: "+ Filter" })] }), filters.length === 0 ? (_jsx("p", { className: "text-xs text-fcr-steel", children: "No filters \u2014 the report returns all rows (up to the cap)." })) : (_jsx("div", { className: "space-y-2", children: filters.map((f, i) => (_jsx(FilterRow, { index: i, filter: f, fields: filterableFields, onChange: (nf) => updateFilter(i, nf), onRemove: () => removeFilter(i) }, i))) })), filters.length >= 2 && (_jsxs("div", { className: "mt-3", children: [_jsx("label", { className: labelCls, htmlFor: "rb-logic", children: "Filter logic" }), _jsx("input", { id: "rb-logic", className: smInput, value: filterLogic, onChange: (e) => setFilterLogic(e.target.value), placeholder: "1 AND (2 OR 3)" }), _jsx("p", { className: "mt-1 text-[11px] text-fcr-steel", children: "AND / OR / NOT and parentheses. Blank = all filters AND'd." })] }))] }), _jsxs("div", { className: card, children: [_jsx("span", { className: labelCls, children: "Summarize (optional)" }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "text-xs text-fcr-steel", children: "Group by" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { className: smInput, value: groupBy?.field ?? "", onChange: (e) => setGroupBy(e.target.value ? { field: e.target.value } : null), children: [_jsx("option", { value: "", children: "\u2014 none \u2014" }), groupableFields.map((f) => (_jsx("option", { value: f.key, children: f.label }, f.key)))] }), groupBy && groupField?.type === "date" && (_jsx("select", { className: `${smInput} w-28`, value: groupBy.bucket ?? "day", onChange: (e) => setGroupBy({ field: groupBy.field, bucket: e.target.value }), children: BUCKETS.map((b) => (_jsx("option", { value: b, children: b }, b))) }))] })] }), _jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-xs text-fcr-steel", children: "Summaries" }), _jsx("button", { type: "button", onClick: addSummary, className: btnSecondary, children: "+ Summary" })] }), summaries.length === 0 ? (_jsx("p", { className: "text-xs text-fcr-steel", children: "Add a summary (count/sum/avg\u2026) to switch to a grouped report." })) : (_jsx("div", { className: "space-y-2", children: summaries.map((s, i) => (_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("select", { className: `${smInput} w-28`, value: s.agg, onChange: (e) => {
                                                const agg = e.target.value;
                                                updateSummary(i, { agg, field: agg === "count" ? "*" : summableFields[0]?.key ?? "*" });
                                            }, children: AGGS.map((a) => (_jsx("option", { value: a, children: a }, a))) }), s.agg === "count" ? (_jsx("span", { className: "text-sm text-fcr-steel", children: "of rows" })) : (_jsx("select", { className: `${smInput} flex-1 min-w-[8rem]`, value: s.field, onChange: (e) => updateSummary(i, { ...s, field: e.target.value }), children: summableFields.map((f) => (_jsx("option", { value: f.key, children: f.label }, f.key))) })), _jsx("button", { type: "button", onClick: () => removeSummary(i), className: "text-fcr-steel hover:text-fcr-red px-1", "aria-label": "Remove summary", children: "\u00D7" })] }, i))) }))] }), _jsxs("div", { className: `${card} space-y-3`, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("button", { type: "button", onClick: run, disabled: pending || !objectKey, className: btnPrimary, children: pending ? "Running…" : "Run report" }), _jsx("button", { type: "button", onClick: exportCsv, disabled: exporting || !ranDefinition, className: btnSecondary, children: exporting ? "Exporting…" : "Export CSV" })] }), !ranDefinition && _jsx("p", { className: "text-xs text-fcr-steel", children: "Run the report to enable CSV export." }), exportMsg && _jsx("p", { className: "text-sm text-fcr-red", children: exportMsg }), _jsxs("div", { className: "border-t border-fcr-line pt-3", children: [_jsx("label", { className: labelCls, htmlFor: "rb-name", children: "Save as" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { id: "rb-name", className: inputCls, value: name, onChange: (e) => setName(e.target.value), placeholder: "Report name" }), _jsx("button", { type: "button", onClick: save, disabled: saving || !name.trim(), className: btnPrimary, children: saving ? "Saving…" : "Save" })] }), saveMsg && _jsx("p", { className: "mt-1 text-sm text-fcr-steel", children: saveMsg })] }), savedReportId && (_jsx("div", { className: "border-t border-fcr-line pt-3", children: _jsx("button", { type: "button", onClick: remove, disabled: deleting, className: btnSecondary, children: deleting ? "Deleting…" : "Delete report" }) }))] })] }), _jsx("div", { children: outcome ? (_jsx(ReportResults, { outcome: outcome, fmt: fmt })) : (_jsxs("div", { className: "rounded-lg border-2 border-dashed border-fcr-line p-8 text-center text-sm text-fcr-steel", children: ["Configure the report and press ", _jsx("span", { className: "font-semibold", children: "Run report" }), " to preview results."] })) })] }));
}
