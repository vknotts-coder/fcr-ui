export interface PickerHit {
    /** The value stored into the unit column (e.g. fcr_collision_account / fcr_collision_contact). */
    sf_id: string;
    name: string;
    sublabel: string | null;
}
export interface RecordPickerProps {
    /** Form field name — the hidden input carries the selected sf_id under this name. */
    name: string;
    label: string;
    /** Typeahead endpoint returning PickerHit[]; called as `${endpoint}?q=...&<queryParams>`. */
    endpoint: string;
    value: PickerHit | null;
    onChange: (hit: PickerHit | null) => void;
    /** Extra query params (e.g. the account sf_id for the contact picker). */
    queryParams?: Record<string, string>;
    disabled?: boolean;
    /** Shown in place of the search box when disabled (e.g. "Choose an account first"). */
    disabledHint?: string;
    placeholder?: string;
    invalid?: boolean;
}
export declare function RecordPicker({ name, label, endpoint, value, onChange, queryParams, disabled, disabledHint, placeholder, invalid, }: RecordPickerProps): import("react").JSX.Element;
//# sourceMappingURL=record-picker.d.ts.map