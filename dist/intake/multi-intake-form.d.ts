import { type FormField, type DuplicateHit } from "@fcr/core/intake";
/** Per-unit and form-level errors/dedupe the batch action returns (index = which unit, null = form). */
export interface MultiFormState {
    errors?: {
        index: number | null;
        field: string | null;
        message: string;
    }[];
    duplicates?: {
        index: number;
        hits: DuplicateHit[];
    }[];
}
type Action = (prev: MultiFormState, formData: FormData) => Promise<MultiFormState>;
export interface MultiIntakeFormProps {
    action: Action;
    /** Unit field config (@fcr/core/intake TRUCK_FORM_FIELDS / TRAILER_FORM_FIELDS). */
    fields: FormField[];
    /** Customer/contact ref columns to EXCLUDE from the per-unit fields (the shared header owns them). */
    customerRefColumn: string;
    contactRefColumn: string;
    accountEndpoint: string;
    contactEndpoint: string;
    cancelHref: string;
    /** Singular label for a unit, e.g. "truck" / "trailer". */
    unitLabel: string;
    submitLabel?: string;
}
export default function MultiIntakeForm({ action, fields, customerRefColumn, contactRefColumn, accountEndpoint, contactEndpoint, cancelHref, unitLabel, submitLabel, }: MultiIntakeFormProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=multi-intake-form.d.ts.map