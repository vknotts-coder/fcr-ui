import type { ReportColumn } from "@fcr/core/reports";
import { type CellFormatters } from "../cells.js";
/** Per-column input descriptor the consumer supplies (from its editable field defs). */
export type EditInput = {
    input: "text" | "textarea" | "date" | "number" | "select";
    /** Options for a `select` (include a leading "" for "clear"); ignored otherwise. */
    options?: string[];
};
/** The injected commit action. Returns the PERSISTED raw value (the server may normalize/derive it) or an
 *  error to surface. Shape matches fcr-trailers' setTrailerFieldAction. */
export type EditCommit = (rowId: string, column: string, value: string) => Promise<{
    ok: true;
    value: string | null;
} | {
    ok: false;
    error: string;
}>;
export declare function EditableCell({ rowId, col, spec, initialRaw, onCommit, fmt, }: {
    rowId: string;
    col: ReportColumn;
    spec: EditInput;
    /** Raw current value for the input ("" = blank). For a date this is the YYYY-MM-DD calendar string. */
    initialRaw: string;
    onCommit: EditCommit;
    fmt?: CellFormatters;
}): import("react").JSX.Element;
//# sourceMappingURL=editable-cell.d.ts.map