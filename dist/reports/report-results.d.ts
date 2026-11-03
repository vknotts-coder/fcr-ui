import type { RunOutcome } from "@fcr/core/reports";
import { type CellFormatters, type DateStyle } from "../cells.js";
export default function ReportResults({ outcome, fmt, dateFormat }: {
    outcome: RunOutcome;
    fmt?: CellFormatters;
    dateFormat?: DateStyle;
}): import("react").JSX.Element;
//# sourceMappingURL=report-results.d.ts.map