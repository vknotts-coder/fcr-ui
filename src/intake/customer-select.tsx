"use client";

// CustomerContactFields (#141 S2) — the shared "who is this for" header of the create-multiple
// intake form: pick an EXISTING customer/contact, OR enter a NEW one inline. This is the piece the
// single-unit UnitForm never had (it only PICKS); the new-customer semantics are ported from
// fcr-sales' bespoke /intake/new page into React, wired to @fcr/core/intake v0.18.0's
// resolveCustomerRef/resolveContactRef via the submitted field contract below.
//
// FIELD CONTRACT (what the app server action reads to build CustomerInput/ContactInput):
//   customer_mode      = "existing" | "new"
//   customer_sf_id     = <sf_id>                       (existing)
//   new_customer_name / _phone / _street / _city / _state / _zip   (new)
//   contact_mode       = "existing" | "new"
//   contact_ref        = <sf_id-or-uuid>               (existing)
//   new_contact_name / _phone / _email / _role         (new)
// A brand-new customer has no existing contacts, so choosing a NEW customer forces a NEW contact.

import { useState } from "react";
import { RecordPicker, ContactSelect, type PickerHit } from "./record-picker.js";

export type CustomerSelection =
  | { mode: "existing"; account: PickerHit | null }
  | { mode: "new"; name: string; phone: string; street: string; city: string; state: string; zip: string };

export type ContactSelection =
  | { mode: "existing"; ref: string }
  | { mode: "new"; name: string; phone: string; email: string; role: string };

export const emptyNewCustomer = { mode: "new" as const, name: "", phone: "", street: "", city: "", state: "", zip: "" };
export const emptyNewContact = { mode: "new" as const, name: "", phone: "", email: "", role: "" };

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

export const inputBase = (invalid?: boolean) =>
  `w-full bg-white border rounded-md px-3 py-2 text-sm text-fcr-ink focus:outline-none focus:ring-2 focus:ring-fcr-red/20 ${
    invalid ? "border-fcr-red" : "border-fcr-line focus:border-fcr-red"
  }`;

function Toggle({ mode, onPick, newLabel }: { mode: "existing" | "new"; onPick: (m: "existing" | "new") => void; newLabel: string }) {
  return (
    <div className="inline-flex rounded-md border border-fcr-line overflow-hidden text-xs font-semibold uppercase tracking-wide">
      <button type="button" onClick={() => onPick("existing")}
        className={`px-3 py-1.5 ${mode === "existing" ? "bg-fcr-red text-white" : "bg-white text-fcr-steel hover:text-fcr-ink"}`}>
        Existing
      </button>
      <button type="button" onClick={() => onPick("new")}
        className={`px-3 py-1.5 border-l border-fcr-line ${mode === "new" ? "bg-fcr-red text-white" : "bg-white text-fcr-steel hover:text-fcr-ink"}`}>
        {newLabel}
      </button>
    </div>
  );
}

function TextField({ name, label, value, onChange, invalid, wide }: { name: string; label: string; value: string; onChange: (v: string) => void; invalid?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={name} className="block text-[10px] uppercase tracking-wider text-fcr-steel font-bold mb-1">{label}</label>
      <input id={name} name={name} value={value} onChange={(e) => onChange(e.target.value)} className={inputBase(invalid)} autoComplete="off" />
    </div>
  );
}

export function CustomerContactFields({ accountEndpoint, contactEndpoint, customer, onCustomer, contact, onContact, invalidFields }: CustomerContactFieldsProps) {
  const inv = invalidFields ?? new Set<string>();
  const customerIsNew = customer.mode === "new";
  // A brand-new customer has no existing contacts — force the contact to "new".
  const contactMode = customerIsNew ? "new" : contact.mode;
  const account = customer.mode === "existing" ? customer.account : null;

  return (
    <div className="space-y-4">
      {/* ── Customer ─────────────────────────────────────────────── */}
      <div className="bg-white border border-fcr-line rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-wide text-fcr-ink font-bold">Customer</h3>
          <Toggle mode={customer.mode} newLabel="New customer"
            onPick={(m) => onCustomer(m === "existing" ? { mode: "existing", account: null } : { ...emptyNewCustomer })} />
        </div>
        <input type="hidden" name="customer_mode" value={customer.mode} />
        {customer.mode === "existing" ? (
          <>
            <input type="hidden" name="customer_sf_id" value={account?.sf_id ?? ""} />
            <RecordPicker
              name="__customer_picker"
              label="Search customers"
              endpoint={accountEndpoint}
              value={account}
              onChange={(h) => {
                onCustomer({ mode: "existing", account: h });
                // A contact belongs to ONE account — changing/clearing the account must reset the
                // contact, or a stale contact_ref (a contact of the OLD account) submits alongside the
                // new customer_sf_id (review #8 HIGH). record-picker.tsx's contract promises this reset.
                onContact({ mode: "existing", ref: "" });
              }}
              invalid={inv.has("customer_sf_id")}
              placeholder="Search customers by name…"
            />
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField name="new_customer_name" label="Customer name" value={customer.name} onChange={(v) => onCustomer({ ...customer, name: v })} invalid={inv.has("new_customer_name")} wide />
            <TextField name="new_customer_phone" label="Phone" value={customer.phone} onChange={(v) => onCustomer({ ...customer, phone: v })} />
            <TextField name="new_customer_street" label="Street" value={customer.street} onChange={(v) => onCustomer({ ...customer, street: v })} />
            <TextField name="new_customer_city" label="City" value={customer.city} onChange={(v) => onCustomer({ ...customer, city: v })} />
            <TextField name="new_customer_state" label="State" value={customer.state} onChange={(v) => onCustomer({ ...customer, state: v })} />
            <TextField name="new_customer_zip" label="ZIP" value={customer.zip} onChange={(v) => onCustomer({ ...customer, zip: v })} />
          </div>
        )}
      </div>

      {/* ── Contact ──────────────────────────────────────────────── */}
      <div className="bg-white border border-fcr-line rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-wide text-fcr-ink font-bold">Contact</h3>
          {!customerIsNew && (
            <Toggle mode={contact.mode} newLabel="New contact"
              onPick={(m) => onContact(m === "existing" ? { mode: "existing", ref: "" } : { ...emptyNewContact })} />
          )}
        </div>
        <input type="hidden" name="contact_mode" value={contactMode} />
        {contactMode === "existing" && contact.mode === "existing" ? (
          <>
            <input type="hidden" name="contact_ref" value={contact.ref} />
            <ContactSelect
              key={account?.sf_id ?? "no-account"}
              name="__contact_picker"
              label="Contact"
              endpoint={contactEndpoint}
              accountSfId={account?.sf_id ?? null}
              value={contact.ref}
              onChange={(ref) => onContact({ mode: "existing", ref })}
              invalid={inv.has("contact_ref")}
            />
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customerIsNew && <p className="sm:col-span-2 text-xs text-fcr-steel">New customer — add their contact below.</p>}
            <TextField name="new_contact_name" label="Contact name" value={contact.mode === "new" ? contact.name : ""} onChange={(v) => onContact({ ...(contact.mode === "new" ? contact : emptyNewContact), name: v })} invalid={inv.has("new_contact_name")} wide />
            <TextField name="new_contact_phone" label="Phone" value={contact.mode === "new" ? contact.phone : ""} onChange={(v) => onContact({ ...(contact.mode === "new" ? contact : emptyNewContact), phone: v })} />
            <TextField name="new_contact_email" label="Email" value={contact.mode === "new" ? contact.email : ""} onChange={(v) => onContact({ ...(contact.mode === "new" ? contact : emptyNewContact), email: v })} />
            <TextField name="new_contact_role" label="Role" value={contact.mode === "new" ? contact.role : ""} onChange={(v) => onContact({ ...(contact.mode === "new" ? contact : emptyNewContact), role: v })} />
          </div>
        )}
      </div>
    </div>
  );
}
