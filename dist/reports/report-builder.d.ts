import type { ClientReportObject, ReportDefinition } from "@fcr/core/reports/definition";
import type { RunOutcome } from "@fcr/core/reports";
import { type CellFormatters, type DateStyle } from "../cells.js";
/** Result of a save action: the new/updated report id, or validation errors. */
export type SaveResult = {
    ok: true;
    id: string;
} | {
    ok: false;
    errors: string[];
};
/** The server actions the builder invokes. Supplied by the consuming app (fcr-dispatch's
 *  src/app/reports/builder/actions.ts, etc.), never imported here. */
export type ReportBuilderActions = {
    runReport: (definition: unknown) => Promise<RunOutcome>;
    saveReport: (name: string, definition: unknown) => Promise<SaveResult>;
    deleteReport: (id: string) => Promise<void>;
};
export type ReportBuilderInitial = {
    objectKey: string;
    definition: ReportDefinition;
    name: string;
};
export default function ReportBuilder({ objects, initial, savedReportId, actions, fmt, dateFormat, exportPath, }: {
    objects: ClientReportObject[];
    initial?: ReportBuilderInitial | null;
    savedReportId?: string | null;
    actions: ReportBuilderActions;
    fmt?: CellFormatters;
    /** Date-cell display style for the live preview (`"iso"` default / `"us"` MM/DD/YY). Forwarded to
     *  ReportResults; the CSV export is unaffected (it re-runs server-side and always emits ISO dates). */
    dateFormat?: DateStyle;
    exportPath?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=report-builder.d.ts.map