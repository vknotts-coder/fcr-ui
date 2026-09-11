"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Status dropdown for a status-selectable list view. Navigates on change, preserving the current sort
// (?sort/?dir) — a URLSearchParams merge, so switching status keeps the column sort. Empty value =
// "All active" (drops ?status). Client component (needs onChange navigation); the grid + sort links stay
// server-rendered.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
export default function StatusSelect({ options, value }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    function onChange(e) {
        const params = new URLSearchParams(searchParams.toString());
        const v = e.target.value;
        if (v)
            params.set("status", v);
        else
            params.delete("status");
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
    }
    return (_jsxs("label", { className: "inline-flex items-center gap-2 text-sm", children: [_jsx("span", { className: "text-xs font-bold uppercase tracking-widest text-fcr-steel", children: "Status" }), _jsxs("select", { value: value ?? "", onChange: onChange, className: "rounded border border-fcr-line bg-white px-2.5 py-1.5 text-sm text-fcr-ink focus:border-fcr-red focus:outline-none", children: [_jsx("option", { value: "", children: "All active" }), options.map((o) => (_jsx("option", { value: o, children: o }, o)))] })] }));
}
