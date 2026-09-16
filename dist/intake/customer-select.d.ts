import { type PickerHit } from "./record-picker.js";
export type CustomerSelection = {
    mode: "existing";
    account: PickerHit | null;
} | {
    mode: "new";
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
};
export type ContactSelection = {
    mode: "existing";
    ref: string;
} | {
    mode: "new";
    name: string;
    phone: string;
    email: string;
    role: string;
};
export declare const emptyNewCustomer: {
    mode: "new";
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
};
export declare const emptyNewContact: {
    mode: "new";
    name: string;
    phone: string;
    email: string;
    role: string;
};
export interface CustomerContactFieldsProps {
    accountEndpoint: string;
    contactEndpoint: string;
    customer: CustomerSelection;
    onCustomer: (c: CustomerSelection) => void;
    contact: ContactSelection;
    onContact: (c: ContactSelection) => void;
    /** Field names flagged invalid by the server (so the control can highlight them). */
    invalidFields?: Set<string>;
}
export declare function CustomerContactFields({ accountEndpoint, contactEndpoint, customer, onCustomer, contact, onContact, invalidFields }: CustomerContactFieldsProps): import("react").JSX.Element;
//# sourceMappingURL=customer-select.d.ts.map