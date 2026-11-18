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
type UnitValues = Record<string, string>;
/**
 * Values a newly-added unit inherits from the previous one: everything the prior unit had EXCEPT the
 * per-unit identity columns (Unit #, VIN), which a new unit must set itself (Van 2026-11-18). Pure so
 * the carry-over contract is unit-testable without a DOM. Excluded columns are dropped (absent), not
 * blanked, so their inputs render empty.
 */
export declare function carryOverValues(lastValues: UnitValues | undefined, excludeColumns: readonly string[]): UnitValues;
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
    /**
     * Columns NOT carried over when "+ Add {unit}" clones the previous unit's values. A new unit
     * inherits the prior one's fields EXCEPT these per-unit identity columns, which it must set itself
     * (Van 2026-11-18). Defaults to the unit-number + VIN columns across both the truck and trailer
     * specs (`sf_name`, `vin`, `full_vin`).
     */
    carryOverExcludeColumns?: string[];
}
export default function MultiIntakeForm({ action, fields, customerRefColumn, contactRefColumn, accountEndpoint, contactEndpoint, cancelHref, unitLabel, submitLabel, carryOverExcludeColumns, }: MultiIntakeFormProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=multi-intake-form.d.ts.map