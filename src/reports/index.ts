// @fcr/ui/reports — the report builder surface (both 'use client'). ReportBuilder is the Salesforce-style
// designer; ReportResults is its presentational results grid (also usable standalone on a saved-report
// page). App server actions + formatters are injected as props (see ReportBuilderActions / CellFormatters).

export { default as ReportBuilder } from "./report-builder.js";
export type { ReportBuilderActions, ReportBuilderInitial, SaveResult } from "./report-builder.js";
export { default as ReportResults } from "./report-results.js";
