import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Error / info banners for the fleet's drag tile boards (extracted from the duplicated StatusBoard /
// EstimatorBoard markup, fcr-estimating #18). A plain presentational component — the board owns the state.
// No "use client": it renders static markup from props and can live in either a server or client tree.
export function BoardBanner({ error, info }) {
    return (_jsxs(_Fragment, { children: [error && (_jsx("div", { role: "alert", className: "mb-3 rounded border border-fcr-red bg-fcr-red/5 px-3 py-2 text-sm text-fcr-red", children: error })), info && (_jsx("div", { role: "status", className: "mb-3 rounded border border-fcr-steel bg-fcr-steel/5 px-3 py-2 text-sm text-fcr-ink/80", children: info }))] }));
}
