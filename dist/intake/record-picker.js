"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Controlled typeahead for an sf_id-valued field (account / contact), lifted from fcr-trailers'
// RecordPicker into @fcr/ui so the whole fleet shares one. Renders a hidden input named `name`
// carrying the selected sf_id, so the form submits exactly what a plain text input would (the
// server action + @fcr/core/intake checkReferences are unchanged). The PARENT owns the selection
// (value/onChange) so a contact picker can be reset + scoped when its account changes. Selection
// lives in the parent's React state, so it survives React 19's post-action form reset (see UnitForm).
import { useEffect, useRef, useState } from "react";
export function RecordPicker({ name, label, endpoint, value, onChange, queryParams, disabled, disabledHint, placeholder, invalid, }) {
    const [query, setQuery] = useState("");
    const [hits, setHits] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [manual, setManual] = useState(""); // raw sf_id entry, shown when no matches
    const boxRef = useRef(null);
    // Serialize queryParams into the SOLE dep — reading the live object in the dep array would re-run
    // the effect every render (a fresh {account} literal each time), refetching in a loop while
    // browsing. The timeout reconstructs params from paramsKey.
    const paramsKey = JSON.stringify(queryParams ?? {});
    useEffect(() => {
        if (value || disabled)
            return; // not searching while a value is chosen or disabled
        const term = query.trim();
        if (term.length < 2) {
            setHits([]);
            setOpen(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const params = JSON.parse(paramsKey);
                const usp = new URLSearchParams({ q: term, ...params });
                const res = await fetch(`${endpoint}?${usp.toString()}`);
                if (!res.ok)
                    throw new Error(String(res.status));
                const data = (await res.json());
                if (!cancelled) {
                    setHits(Array.isArray(data) ? data : []);
                    setOpen(true);
                }
            }
            catch {
                if (!cancelled) {
                    setHits([]);
                    setOpen(true); // show "no matches" rather than a silent nothing
                }
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [query, endpoint, paramsKey, value, disabled]);
    // Close the dropdown on an outside click.
    useEffect(() => {
        function onDoc(e) {
            if (boxRef.current && !boxRef.current.contains(e.target))
                setOpen(false);
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);
    const inputBase = `w-full bg-white border rounded-md px-3 py-2 text-sm text-fcr-ink focus:outline-none focus:ring-2 focus:ring-fcr-red/20 ${invalid ? "border-fcr-red" : "border-fcr-line focus:border-fcr-red"}`;
    return (_jsxs("div", { ref: boxRef, className: "relative", children: [_jsx("label", { className: "block text-[10px] uppercase tracking-wider text-fcr-steel font-bold mb-1", children: label }), _jsx("input", { type: "hidden", name: name, value: value?.sf_id ?? "" }), value ? (_jsxs("div", { className: "flex items-center gap-2 rounded-md border border-fcr-line bg-fcr-paper px-3 py-2", children: [_jsx("span", { className: "text-sm text-fcr-ink truncate", children: value.name }), _jsx("button", { type: "button", onClick: () => {
                            onChange(null);
                            setQuery("");
                            setHits([]);
                        }, className: "ml-auto text-[11px] font-semibold uppercase tracking-wide text-fcr-steel hover:text-fcr-red", children: "Change" })] })) : disabled ? (_jsx("div", { className: "rounded-md border border-dashed border-fcr-line px-3 py-2 text-sm text-fcr-steel", children: disabledHint ?? "Unavailable" })) : (_jsxs(_Fragment, { children: [_jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), onFocus: () => hits.length > 0 && setOpen(true), placeholder: placeholder ?? "Search by name…", className: inputBase, autoComplete: "off" }), open && (_jsx("ul", { className: "absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-md border border-fcr-line bg-white shadow-lg", children: loading ? (_jsx("li", { className: "px-3 py-2 text-sm text-fcr-steel", children: "Searching\u2026" })) : hits.length === 0 ? (
                        // No matches — offer a manual sf_id entry so a required account/contact can still be
                        // set for the rare record with no searchable row (e.g. an account with no contacts).
                        _jsxs("li", { className: "px-3 py-2", children: [_jsx("div", { className: "text-sm text-fcr-steel mb-1.5", children: "No matches." }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("input", { value: manual, onChange: (e) => setManual(e.target.value), placeholder: "Enter sf_id manually", className: "flex-1 bg-white border border-fcr-line rounded px-2 py-1 text-xs" }), _jsx("button", { type: "button", disabled: !manual.trim(), onClick: () => {
                                                const id = manual.trim();
                                                if (!id)
                                                    return;
                                                onChange({ sf_id: id, name: id, sublabel: null });
                                                setManual("");
                                                setOpen(false);
                                                setQuery("");
                                            }, className: "text-[11px] font-semibold uppercase tracking-wide text-fcr-red disabled:opacity-40", children: "Set" })] })] })) : (hits.map((h) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => {
                                    onChange(h);
                                    setOpen(false);
                                    setQuery("");
                                }, className: "block w-full text-left px-3 py-2 hover:bg-fcr-paper", children: [_jsx("div", { className: "text-sm text-fcr-ink", children: h.name }), h.sublabel ? _jsx("div", { className: "text-[11px] text-fcr-steel", children: h.sublabel }) : null] }) }, h.sf_id)))) }))] }))] }));
}
