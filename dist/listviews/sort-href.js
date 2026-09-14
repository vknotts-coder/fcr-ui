// The querystring a column-sort link points at — pure so it's unit-testable without rendering the grid.
// Order matters: `baseParams` (the consumer's other params — selected view, account/team filter, search)
// is applied FIRST, then status/sort/dir win on any key collision. Empty/undefined baseParams values are
// skipped so a blank filter doesn't pin an empty param. Consumers whose state is entirely in the route
// path pass no baseParams and get just status/sort/dir.
export function sortQuery(colKey, nextDir, status, baseParams) {
    const params = new URLSearchParams();
    if (baseParams)
        for (const [k, v] of Object.entries(baseParams))
            if (v != null && v !== "")
                params.set(k, v);
    if (status)
        params.set("status", status);
    params.set("sort", colKey);
    params.set("dir", nextDir);
    return params.toString();
}
