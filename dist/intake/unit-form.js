"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// UnitForm (#141) — the shared create/edit form for a truck or trailer, extracted from
// fcr-trailers' TrailerForm and generalized. Field config + sections come from @fcr/core/intake
// (one source of truth with the server-side parse/validate). The submit invokes an INJECTED
// server action (the `action` prop) — the app's action re-gates + re-validates and calls
// @fcr/core/intake's createUnit/updateUnit, so this component is a convenience, never the
// security boundary. Account/contact fields render via an optional `renderPicker` render-prop
// the app supplies (a typeahead against its own search endpoints); with none, they fall back to
// plain SF-id text inputs so the form works with no app-specific wiring.
import { useActionState, useState } from "react";
import { SECTION_ORDER, SECTION_TITLES, } from "@fcr/core/intake";
export default function UnitForm({ action, fields, mode, cancelHref, initial = {}, fieldOptions, pickerColumns = [], renderPicker, submitLabel, }) {
    const [state, formAction, pending] = useActionState(action, {});
    const errors = state.errors ?? [];
    const duplicates = state.duplicates ?? [];
    const errorFields = new Set(errors.map((e) => e.field).filter(Boolean));
    // "Create anyway" — set the confirm flag then let the form submit again past the dedupe guard.
    const [confirmDup, setConfirmDup] = useState(false);
    const pickerSet = new Set(pickerColumns);
    const bySection = new Map();
    for (const f of fields) {
        const list = bySection.get(f.section) ?? [];
        list.push(f);
        bySection.set(f.section, list);
    }
    const labels = submitLabel ?? { create: "Create", edit: "Save changes" };
    return (_jsxs("form", { action: formAction, className: "space-y-5", children: [errors.length > 0 && (_jsxs("div", { className: "bg-fcr-red/10 border border-fcr-red/40 rounded-xl p-4", role: "alert", children: [_jsx("div", { className: "text-sm font-semibold text-fcr-red mb-1", children: "Please fix the following:" }), _jsx("ul", { className: "list-disc list-inside text-sm text-fcr-red space-y-0.5", children: errors.map((e, i) => (_jsx("li", { children: e.message }, i))) })] })), duplicates.length > 0 && (_jsxs("div", { className: "bg-fcr-amber/10 border border-fcr-amber/50 rounded-xl p-4", role: "alert", children: [_jsx("div", { className: "text-sm font-semibold text-fcr-ink mb-1", children: "Possible duplicate \u2014 is this already in the system?" }), _jsx("ul", { className: "text-sm text-fcr-ink space-y-1 mb-2", children: duplicates.map((d) => (_jsxs("li", { className: "flex items-center gap-2", children: [_jsx("span", { className: "uppercase text-[10px] tracking-wider text-fcr-steel", children: d.unitType }), _jsx("span", { className: "font-medium", children: d.sfName ?? "(no unit #)" }), _jsxs("span", { className: "text-fcr-steel", children: ["\u00B7 matched on ", d.matchedOn] }), _jsx("a", { href: `/records/${d.unitType}/${d.id}`, className: "text-fcr-red underline ml-1", children: "Open" })] }, `${d.unitType}:${d.id}`))) }), _jsx("p", { className: "text-xs text-fcr-steel", children: "Choosing \u201CCreate anyway\u201D will add a new record even though a match exists." })] })), _jsx("input", { type: "hidden", name: "__confirm_duplicate", value: confirmDup ? "1" : "" }), SECTION_ORDER.map((section) => {
                const list = bySection.get(section) ?? [];
                if (list.length === 0)
                    return null;
                return (_jsxs("section", { className: "bg-white border border-fcr-line rounded-2xl p-4", children: [_jsx("h2", { className: "text-sm uppercase tracking-wide text-fcr-ink font-bold mb-3", children: SECTION_TITLES[section] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3", children: list.map((f) => {
                                const value = initial[f.column] ?? "";
                                const invalid = errorFields.has(f.column);
                                if (pickerSet.has(f.column) && renderPicker) {
                                    return _jsx("div", { children: renderPicker({ field: f, value, invalid }) }, f.column);
                                }
                                return (_jsx(FieldInput, { field: f, value: value, invalid: invalid, options: fieldOptions?.[f.column] }, f.column));
                            }) })] }, section));
            }), _jsxs("div", { className: "flex items-center gap-3 sticky bottom-0 bg-fcr-paper/95 backdrop-blur border-t border-fcr-line py-3", children: [_jsx("button", { type: "submit", disabled: pending, className: "bg-fcr-red hover:bg-fcr-red-dark disabled:opacity-60 transition-colors text-white font-semibold rounded-md px-6 py-2.5 uppercase tracking-wider text-sm", children: pending ? "Saving…" : mode === "create" ? labels.create : labels.edit }), duplicates.length > 0 && (_jsx("button", { type: "submit", disabled: pending, onClick: () => setConfirmDup(true), className: "border border-fcr-amber text-fcr-ink hover:bg-fcr-amber/20 disabled:opacity-60 transition-colors font-semibold rounded-md px-4 py-2.5 uppercase tracking-wider text-sm", children: "Create anyway" })), _jsx("a", { href: cancelHref, className: "text-sm text-fcr-steel hover:text-fcr-ink", children: "Cancel" })] })] }));
}
function FieldInput({ field, value, invalid, options, }) {
    const selectOptions = options ?? field.options ?? [];
    const base = `w-full bg-white border rounded-md px-3 py-2 text-sm text-fcr-ink focus:outline-none focus:ring-2 focus:ring-fcr-red/20 ${invalid ? "border-fcr-red" : "border-fcr-line focus:border-fcr-red"}`;
    const isWide = field.input === "textarea";
    return (_jsxs("div", { className: isWide ? "sm:col-span-2 lg:col-span-3" : "", children: [_jsx("label", { htmlFor: field.column, className: "block text-[10px] uppercase tracking-wider text-fcr-steel font-bold mb-1", children: field.label }), field.input === "select" ? (_jsx("select", { id: field.column, name: field.column, defaultValue: value, className: base, children: selectOptions.map((o) => (_jsx("option", { value: o, children: o === "" ? "—" : o }, o))) })) : field.input === "textarea" ? (_jsx("textarea", { id: field.column, name: field.column, defaultValue: value, rows: 2, className: base })) : (_jsx("input", { id: field.column, name: field.column, type: field.input === "date" ? "date" : field.input === "number" ? "number" : "text", step: field.input === "number" ? "any" : undefined, defaultValue: value, className: base }))] }));
}
