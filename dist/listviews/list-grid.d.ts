import type { ReportColumn, TabularResult } from "@fcr/core/reports";
import type { ReportSort } from "@fcr/core/reports/definition";
import { type CellFormatters } from "../cells.js";
/** Header cell: a link that sorts by this column. Clicking the already-active column flips direction;
 *  a new column starts ascending. Carries aria-sort for assistive tech. `status` (the current dropdown
 *  selection) is preserved in the href so sorting doesn't reset the status filter. */
export declare function SortableHeader({ col, sort, status }: {
    col: ReportColumn;
    sort: ReportSort;
    status?: string | null;
}): import("react").JSX.Element;
export default function ListGrid({ result, sort, status, fmt, }: {
    result: TabularResult;
    sort: ReportSort;
    status?: string | null;
    fmt: CellFormatters;
}): import("react").JSX.Element;
//# sourceMappingURL=list-grid.d.ts.map