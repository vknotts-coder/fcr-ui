import { type ReactNode } from "react";
import { type FormField, type ValidationError, type DuplicateHit } from "@fcr/core/intake";
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
    /** Columns rendered via `renderPicker` instead of a generic input (account/contact). */
    pickerColumns?: string[];
    /** App-supplied typeahead for a picker column; falls back to a text input when absent. */
    renderPicker?: (args: {
        field: FormField;
        value: string;
        invalid: boolean;
    }) => ReactNode;
    submitLabel?: {
        create: string;
        edit: string;
    };
}
export default function UnitForm({ action, fields, mode, cancelHref, initial, fieldOptions, pickerColumns, renderPicker, submitLabel, }: UnitFormProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=unit-form.d.ts.map