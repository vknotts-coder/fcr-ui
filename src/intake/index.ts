// @fcr/ui/intake — the shared truck/trailer create/edit form ('use client'). Field config +
// sections come from @fcr/core/intake; the submit invokes an injected app server action that
// calls @fcr/core/intake's createUnit/updateUnit. See UnitForm for the props/injection seam.

export { default as UnitForm } from "./unit-form.js";
export type { UnitFormProps, FormState, AccountContactConfig } from "./unit-form.js";
export { RecordPicker, ContactSelect, type PickerHit, type RecordPickerProps, type ContactSelectProps } from "./record-picker.js";

// Create-multiple (#141 S2): one customer/contact (pick-or-new) + one-or-many units, wizard/scroll modes.
export { default as MultiIntakeForm, type MultiIntakeFormProps, type MultiFormState } from "./multi-intake-form.js";
export { CustomerContactFields, type CustomerContactFieldsProps, type CustomerSelection, type ContactSelection } from "./customer-select.js";
