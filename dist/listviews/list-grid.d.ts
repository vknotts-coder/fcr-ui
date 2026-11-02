import type { CellValue, ReportColumn, TabularResult } from "@fcr/core/reports";
import type { ReportSort } from "@fcr/core/reports/definition";
import { type CellFormatters } from "../cells.js";
import { type EditInput, type EditCommit } from "./editable-cell.js";
export type { EditInput, EditCommit } from "./editable-cell.js";
/** Opt-in inline editing for a list grid. When provided, a cell whose column `specFor` returns a non-null
 *  input spec (and whose row resolves to a record id) renders as an editable cell wired to `onCommit`. Omit
 *  the prop for the default read-only grid. The consumer owns all policy: which columns are editable, the
 *  gated commit action, and how a row maps to its record id. The first (record-link) column stays a
 *  navigation link and is never made editable. */
export type EditableConfig = {
    specFor: (col: ReportColumn) => EditInput | null;
    onCommit: EditCommit;
    rowId: (row: Record<string, CellValue>, href: string | null) => string | null;
};
/** Header cell: a link that sorts by this column. Clicking the already-active column flips direction;
 *  a new column starts ascending. Carries aria-sort for assistive tech. The sort href preserves `status`
 *  (the dropdown selection) AND every entry in `baseParams` — the consumer's other querystring params
 *  (a selected list view, an account/team filter, a search term) — so sorting doesn't reset them.
 *  `baseParams` is set first, then `status`/`sort`/`dir` win on any key collision. Empty/undefined values
 *  are skipped. A consumer whose page state is entirely in the path (e.g. `/list/[object]/[view]`) passes
 *  nothing and gets the prior behavior. */
export declare function SortableHeader({ col, sort, status, baseParams }: {
    col: ReportColumn;
    sort: ReportSort;
    status?: string | null;
    baseParams?: Record<string, string | undefined>;
}): import("react").JSX.Element;
export default function ListGrid({ result, sort, status, baseParams, fmt, editable, }: {
    result: TabularResult;
    sort: ReportSort;
    status?: string | null;
    /** Extra querystring params to preserve on every column-sort link (a selected view, account/team filter,
     *  search term). See SortableHeader. Omit when all page state lives in the route path. */
    baseParams?: Record<string, string | undefined>;
    fmt?: CellFormatters;
    /** Opt-in inline editing. Omit for the default read-only grid. See EditableConfig. */
    editable?: EditableConfig;
}): import("react").JSX.Element;
//# sourceMappingURL=list-grid.d.ts.map