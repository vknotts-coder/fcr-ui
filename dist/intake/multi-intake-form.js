"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// MultiIntakeForm (#141 S2) — the create-multiple intake form: one customer/contact, one-or-many
// units, in a single submit. Wraps the CustomerContactFields header (pick-or-new) over an N-unit
// repeater of the SAME field config the single UnitForm uses, then a review. Submits to an injected
// app server action that de-prefixes the units and calls @fcr/core/intake v0.18.0 createUnits.
//
// TWO VIEW MODES (Van, 2026-09-16), one implementation: "scroll" shows all three sections at once;
// "wizard" shows one step at a time with Back/Next. All sections stay MOUNTED in both modes (wizard
// just visually hides the others), so every field submits regardless of which step is visible and
// state never resets between steps.
//
// SUBMITTED FIELD CONTRACT (the app action reads these):
//   customer_* / contact_*  — see customer-select.tsx
//   unit_count = N
//   unit_<i>_<column>       — each unit's own fields (NOT the customer/contact ref columns; the
//                             engine's createUnits injects those from the shared header)
//   __confirm_duplicate=1   — carried by "Create anyway" to override a dedupe block
import { useActionState, useEffect, useRef, useState } from "react";
import { SECTION_ORDER, SECTION_TITLES } from "@fcr/core/intake";
import { CustomerContactFields, inputBase, } from "./customer-select.js";
const btnPrimary = "bg-fcr-red hover:bg-fcr-red-dark disabled:opacity-60 transition-colors text-white font-semibold rounded-md px-6 py-2.5 uppercase tracking-wider text-sm";
const btnGhost = "border border-fcr-line text-fcr-ink hover:bg-fcr-paper transition-colors font-semibold rounded-md px-4 py-2.5 uppercase tracking-wider text-sm";
export default function MultiIntakeForm({ action, fields, customerRefColumn, contactRefColumn, accountEndpoint, contactEndpoint, cancelHref, unitLabel, submitLabel, }) {
    const [state, formAction, pending] = useActionState(action, {});
    const errors = state.errors ?? [];
    const duplicates = state.duplicates ?? [];
    const hasDuplicates = duplicates.length > 0;
    const [mode, setMode] = useState("scroll");
    const [step, setStep] = useState(0); // wizard step: 0 customer/contact · 1 units · 2 review
    const [customer, setCustomer] = useState({ mode: "existing", account: null });
    const [contact, setContact] = useState({ mode: "existing", ref: "" });
    // Units carry a STABLE client id so a React key survives add/remove (index keys remount inputs) and
    // so server errors (keyed by batch POSITION) can be suppressed when the array is restructured.
    const nextId = useRef(1);
    const [units, setUnits] = useState([{ id: 0, values: {} }]);
    // Server errors/dedupe come back keyed by the submitted batch POSITION. If the user adds/removes a
    // unit after a failed submit, positions shift and those markers would flag the WRONG unit (review #8
    // MEDIUM). Track a structural change since the last result and hide the per-unit markers until the
    // next submit re-keys them. Edits don't shift positions, so they don't set this.
    const [restructured, setRestructured] = useState(false);
    useEffect(() => setRestructured(false), [state]); // a fresh action result re-aligns errors to positions
    // The per-unit fields exclude the customer/contact ref columns (the header resolves those; the
    // engine injects them into each unit) and any status/derived column the engine seeds.
    const unitFields = fields.filter((f) => f.column !== customerRefColumn && f.column !== contactRefColumn);
    const errorFieldsFor = (index) => restructured && index != null
        ? new Set()
        : new Set(errors.filter((e) => e.index === index).map((e) => e.field).filter(Boolean));
    const setUnit = (i, col, v) => setUnits((prev) => prev.map((u, j) => (j === i ? { ...u, values: { ...u.values, [col]: v } } : u)));
    const addUnit = () => {
        setUnits((prev) => [...prev, { id: nextId.current++, values: {} }]);
        setRestructured(true);
    };
    const removeUnit = (i) => {
        setUnits((prev) => (prev.length === 1 ? prev : prev.filter((_, j) => j !== i)));
        setRestructured(true);
    };
    const customerName = customer.mode === "new" ? customer.name || "(new customer)" : customer.account?.name || "(none selected)";
    // Section visibility: wizard shows only `step`; scroll shows all. Non-current sections stay mounted
    // (hidden) so their inputs still submit and their state survives.
    const show = (s) => (mode === "scroll" ? "" : step === s ? "" : "hidden");
    return (_jsxs("form", { action: formAction, className: "space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "inline-flex rounded-md border border-fcr-line overflow-hidden text-xs font-semibold uppercase tracking-wide", children: [_jsx("button", { type: "button", onClick: () => setMode("scroll"), className: `px-3 py-1.5 ${mode === "scroll" ? "bg-fcr-ink text-white" : "bg-white text-fcr-steel hover:text-fcr-ink"}`, children: "All on one page" }), _jsx("button", { type: "button", onClick: () => setMode("wizard"), className: `px-3 py-1.5 border-l border-fcr-line ${mode === "wizard" ? "bg-fcr-ink text-white" : "bg-white text-fcr-steel hover:text-fcr-ink"}`, children: "Step by step" })] }), mode === "wizard" && (_jsxs("div", { className: "text-xs uppercase tracking-wide text-fcr-steel", children: ["Step ", step + 1, " of 3 \u00B7 ", ["Customer & contact", "Units", "Review"][step]] }))] }), (() => {
                const shown = restructured ? errors.filter((e) => e.index == null) : errors;
                return shown.length > 0 ? (_jsxs("div", { className: "bg-fcr-red/10 border border-fcr-red/40 rounded-xl p-4", role: "alert", children: [_jsx("div", { className: "text-sm font-semibold text-fcr-red mb-1", children: "Please fix the following:" }), _jsx("ul", { className: "list-disc list-inside text-sm text-fcr-red space-y-0.5", children: shown.map((e, i) => (_jsxs("li", { children: [e.index != null ? `${unitLabel} ${e.index + 1}: ` : "", e.message] }, i))) })] })) : null;
            })(), _jsxs("div", { className: show(0), children: [_jsx(SectionHeading, { n: 1, children: "Customer & contact" }), _jsx("input", { type: "hidden", name: "unit_count", value: units.length }), _jsx(CustomerContactFields, { accountEndpoint: accountEndpoint, contactEndpoint: contactEndpoint, customer: customer, onCustomer: setCustomer, contact: contact, onContact: setContact, invalidFields: errorFieldsFor(null) })] }), _jsxs("div", { className: show(1), children: [_jsx(SectionHeading, { n: 2, children: unitLabel === "truck" ? "Trucks" : unitLabel === "trailer" ? "Trailers" : "Units" }), _jsxs("div", { className: "space-y-4", children: [units.map((u, i) => {
                                const dupHit = restructured ? undefined : duplicates.find((d) => d.index === i);
                                return (_jsxs("div", { className: "bg-white border border-fcr-line rounded-2xl p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h3", { className: "text-sm uppercase tracking-wide text-fcr-ink font-bold", children: [unitLabel, " ", i + 1] }), units.length > 1 && (_jsx("button", { type: "button", onClick: () => removeUnit(i), className: "text-[11px] font-semibold uppercase tracking-wide text-fcr-steel hover:text-fcr-red", children: "Remove" }))] }), dupHit && (_jsxs("div", { className: "bg-fcr-amber/10 border border-fcr-amber/50 rounded-lg p-3 text-sm", children: [_jsx("div", { className: "font-semibold text-fcr-ink mb-1", children: "Possible duplicate:" }), _jsx("ul", { className: "space-y-0.5", children: dupHit.hits.map((h) => (_jsxs("li", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium", children: h.sfName ?? "(no unit #)" }), _jsxs("span", { className: "text-fcr-steel", children: ["\u00B7 ", h.matchedOn] }), _jsx("a", { href: `/records/${h.unitType}/${h.id}`, className: "text-fcr-red underline ml-1", children: "Open" })] }, `${h.unitType}:${h.id}`))) })] })), _jsx(UnitFields, { fields: unitFields, prefix: `unit_${i}_`, values: u.values, onChange: (col, v) => setUnit(i, col, v), invalid: errorFieldsFor(i) })] }, u.id));
                            }), _jsxs("button", { type: "button", onClick: addUnit, className: btnGhost, children: ["+ Add ", unitLabel] })] })] }), _jsxs("div", { className: show(2), children: [_jsx(SectionHeading, { n: 3, children: "Review" }), _jsxs("div", { className: "bg-white border border-fcr-line rounded-2xl p-4 text-sm text-fcr-ink space-y-2", children: [_jsxs("div", { children: [_jsx("span", { className: "text-fcr-steel", children: "Customer:" }), " ", _jsx("span", { className: "font-medium", children: customerName }), customer.mode === "new" && _jsx("span", { className: "ml-1 text-[10px] uppercase tracking-wide text-fcr-red", children: "new" })] }), _jsx("div", { children: _jsxs("span", { className: "text-fcr-steel", children: [units.length, " ", unitLabel, units.length === 1 ? "" : "s", ":"] }) }), _jsx("ul", { className: "list-disc list-inside text-fcr-steel", children: units.map((u, i) => (_jsxs("li", { children: [u.values.sf_name || `${unitLabel} ${i + 1}`, u.values.vin || u.values.full_vin ? ` · VIN ${u.values.vin || u.values.full_vin}` : ""] }, u.id))) })] })] }), _jsxs("div", { className: "flex items-center gap-3 sticky bottom-0 bg-fcr-paper/95 backdrop-blur border-t border-fcr-line py-3", children: [mode === "wizard" && step > 0 && (_jsx("button", { type: "button", onClick: () => setStep((s) => s - 1), className: btnGhost, children: "Back" })), mode === "wizard" && step < 2 ? (_jsx("button", { type: "button", onClick: () => setStep((s) => s + 1), className: btnPrimary, children: "Next" })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "submit", disabled: pending, className: btnPrimary, children: pending ? "Saving…" : (submitLabel ?? `Create ${units.length} ${unitLabel}${units.length === 1 ? "" : "s"}`) }), hasDuplicates && (_jsx("button", { type: "submit", name: "__confirm_duplicate", value: "1", disabled: pending, className: "border border-fcr-amber text-fcr-ink hover:bg-fcr-amber/20 disabled:opacity-60 transition-colors font-semibold rounded-md px-4 py-2.5 uppercase tracking-wider text-sm", children: "Create anyway" }))] })), _jsx("a", { href: cancelHref, className: "text-sm text-fcr-steel hover:text-fcr-ink", children: "Cancel" })] })] }));
}
function SectionHeading({ n, children }) {
    return (_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("span", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-fcr-ink text-white text-xs font-bold", children: n }), _jsx("h2", { className: "text-sm uppercase tracking-wide text-fcr-ink font-bold", children: children })] }));
}
function UnitFields({ fields, prefix, values, onChange, invalid }) {
    const bySection = new Map();
    for (const f of fields) {
        const list = bySection.get(f.section) ?? [];
        list.push(f);
        bySection.set(f.section, list);
    }
    return (_jsx("div", { className: "space-y-3", children: SECTION_ORDER.map((section) => {
            const list = bySection.get(section) ?? [];
            if (list.length === 0)
                return null;
            return (_jsxs("div", { children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-fcr-steel font-bold mb-1.5", children: SECTION_TITLES[section] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3", children: list.map((f) => {
                            const name = `${prefix}${f.column}`;
                            const value = values[f.column] ?? "";
                            const isInvalid = invalid.has(f.column);
                            const base = inputBase(isInvalid);
                            const wide = f.input === "textarea";
                            return (_jsxs("div", { className: wide ? "sm:col-span-2 lg:col-span-3" : "", children: [_jsx("label", { htmlFor: name, className: "block text-[10px] uppercase tracking-wider text-fcr-steel font-bold mb-1", children: f.label }), f.input === "select" ? (_jsx("select", { id: name, name: name, value: value, onChange: (e) => onChange(f.column, e.target.value), className: base, children: (f.options ?? []).map((o) => _jsx("option", { value: o, children: o === "" ? "—" : o }, o)) })) : f.input === "textarea" ? (_jsx("textarea", { id: name, name: name, value: value, onChange: (e) => onChange(f.column, e.target.value), rows: 2, className: base })) : (_jsx("input", { id: name, name: name, type: f.input === "date" ? "date" : f.input === "number" ? "number" : "text", step: f.input === "number" ? "any" : undefined, value: value, onChange: (e) => onChange(f.column, e.target.value), className: base }))] }, f.column));
                        }) })] }, section));
        }) }));
}
