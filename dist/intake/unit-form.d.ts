import { type ReactNode } from "react";
import { type FormField, type ValidationError, type DuplicateHit } from "@fcr/core/intake";
import { type PickerHit } from "./record-picker.js";
/** Wiring for the coordinated account + contact typeahead pickers. When supplied, UnitForm renders
 *  these two columns as searchable RecordPickers instead of plain sf-id text inputs: the account
 *  picker searches the customer base, and selecting an account scopes + resets the contact picker to
 *  that account's contacts. The app supplies its own search endpoints (same-origin GET → PickerHit[]).*/
export interface AccountContactConfig {
    accountColumn: string;
    contactColumn: string;
    /** GET endpoint: `${accountEndpoint}?q=` → PickerHit[] over the customer base. */
    accountEndpoint: string;
    /** GET endpoint: `${contactEndpoint}?q=&account=<sf_id>` → PickerHit[] scoped to that account. */
    contactEndpoint: string;
    accountLabel?: string;
    contactLabel?: string;
    /** Edit-mode: preselected account/contact (resolved sf_id → hit by the caller). */
    initialAccount?: PickerHit | null;
    initialContact?: PickerHit | null;
}
export interface FormState {
    errors?: ValidationError[];
    duplicates?: DuplicateHit[];
}
type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
export interface UnitFormProps {
    /** The injected server action (create or edit). */
    action: Action;
    /** Field config for this unit type — @fcr/core/intake TRUCK_FORM_FIELDS / TRAILER_FORM_FIELDS. */
    fields: FormField[];
    mode: "create" | "edit";
    cancelHref: string;
    /** Existing values (edit mode) keyed by column. */
    initial?: Record<string, string>;
    /** Per-column select options resolved at render (e.g. the live driver list), overriding a field's static options. */
    fieldOptions?: Record<string, string[]>;
    /** Columns rendered via `renderPicker` instead of a generic input (a generic escape hatch). */
    pickerColumns?: string[];
    /** App-supplied typeahead for a picker column; falls back to a text input when absent. */
    renderPicker?: (args: {
        field: FormField;
        value: string;
        invalid: boolean;
    }) => ReactNode;
    /** The coordinated account+contact typeahead (see AccountContactConfig). */
    accountContact?: AccountContactConfig;
    submitLabel?: {
        create: string;
        edit: string;
    };
}
export default function UnitForm({ action, fields, mode, cancelHref, initial, fieldOptions, pickerColumns, renderPicker, accountContact, submitLabel, }: UnitFormProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=unit-form.d.ts.map