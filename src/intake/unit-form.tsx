"use client";

// UnitForm (#141) — the shared create/edit form for a truck or trailer, extracted from
// fcr-trailers' TrailerForm and generalized. Field config + sections come from @fcr/core/intake
// (one source of truth with the server-side parse/validate). The submit invokes an INJECTED
// server action (the `action` prop) — the app's action re-gates + re-validates and calls
// @fcr/core/intake's createUnit/updateUnit, so this component is a convenience, never the
// security boundary. Account/contact fields render via an optional `renderPicker` render-prop
// the app supplies (a typeahead against its own search endpoints); with none, they fall back to
// plain SF-id text inputs so the form works with no app-specific wiring.

import { useActionState, useState, type ReactNode } from "react";
import {
  SECTION_ORDER,
  SECTION_TITLES,
  type FormField,
  type ValidationError,
  type DuplicateHit,
} from "@fcr/core/intake";
import { RecordPicker, type PickerHit } from "./record-picker.js";

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
  renderPicker?: (args: { field: FormField; value: string; invalid: boolean }) => ReactNode;
  /** The coordinated account+contact typeahead (see AccountContactConfig). */
  accountContact?: AccountContactConfig;
  submitLabel?: { create: string; edit: string };
}

export default function UnitForm({
  action,
  fields,
  mode,
  cancelHref,
  initial = {},
  fieldOptions,
  pickerColumns = [],
  renderPicker,
  accountContact,
  submitLabel,
}: UnitFormProps) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const errors = state.errors ?? [];
  const duplicates = state.duplicates ?? [];
  const errorFields = new Set(errors.map((e) => e.field).filter(Boolean) as string[]);

  // Coordinated account/contact typeahead selection. Held in React state so it survives React 19's
  // post-action form reset (same reason the fields below are controlled). Choosing an account resets
  // the contact and scopes the contact endpoint to that account.
  const [account, setAccount] = useState<PickerHit | null>(accountContact?.initialAccount ?? null);
  const [contact, setContact] = useState<PickerHit | null>(accountContact?.initialContact ?? null);
  const acCols = new Set(accountContact ? [accountContact.accountColumn, accountContact.contactColumn] : []);
  const acSection = accountContact
    ? fields.find((f) => f.column === accountContact.accountColumn)?.section
    : undefined;

  // CONTROLLED field values. React 19 auto-resets an uncontrolled form after a form-action that
  // returns without redirecting — so on a validation error OR a dedupe block (both return state,
  // neither redirects) every uncontrolled input would be wiped, losing what the user typed and
  // making "Create anyway" resubmit an empty form. Driving these off React state instead keeps the
  // values across the re-render, so the override resubmits the real data and errors don't clear it.
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...initial }));
  const setField = (col: string, v: string) => setValues((prev) => ({ ...prev, [col]: v }));

  const pickerSet = new Set(pickerColumns);
  const bySection = new Map<string, FormField[]>();
  for (const f of fields) {
    const list = bySection.get(f.section) ?? [];
    list.push(f);
    bySection.set(f.section, list);
  }

  const labels = submitLabel ?? { create: "Create", edit: "Save changes" };

  return (
    <form action={formAction} className="space-y-5">
      {errors.length > 0 && (
        <div className="bg-fcr-red/10 border border-fcr-red/40 rounded-xl p-4" role="alert">
          <div className="text-sm font-semibold text-fcr-red mb-1">Please fix the following:</div>
          <ul className="list-disc list-inside text-sm text-fcr-red space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="bg-fcr-amber/10 border border-fcr-amber/50 rounded-xl p-4" role="alert">
          <div className="text-sm font-semibold text-fcr-ink mb-1">Possible duplicate — is this already in the system?</div>
          <ul className="text-sm text-fcr-ink space-y-1 mb-2">
            {duplicates.map((d) => (
              <li key={`${d.unitType}:${d.id}`} className="flex items-center gap-2">
                <span className="uppercase text-[10px] tracking-wider text-fcr-steel">{d.unitType}</span>
                <span className="font-medium">{d.sfName ?? "(no unit #)"}</span>
                <span className="text-fcr-steel">· matched on {d.matchedOn}</span>
                {/* href derived from the serializable DuplicateHit — the fleet's /records/<type>/<id>
                    convention. Built here (not injected as a fn prop) so nothing non-serializable
                    crosses the Server→Client boundary. */}
                <a href={`/records/${d.unitType}/${d.id}`} className="text-fcr-red underline ml-1">Open</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-fcr-steel">Choosing “Create anyway” will add a new record even though a match exists.</p>
        </div>
      )}

      {SECTION_ORDER.map((section) => {
        const list = (bySection.get(section) ?? []).filter((f) => !acCols.has(f.column));
        const showPickers = accountContact && section === acSection;
        if (list.length === 0 && !showPickers) return null;
        return (
          <section key={section} className="bg-white border border-fcr-line rounded-2xl p-4">
            <h2 className="text-sm uppercase tracking-wide text-fcr-ink font-bold mb-3">{SECTION_TITLES[section]}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
              {showPickers && accountContact && (
                <>
                  <RecordPicker
                    name={accountContact.accountColumn}
                    label={accountContact.accountLabel ?? "Account"}
                    endpoint={accountContact.accountEndpoint}
                    value={account}
                    onChange={(h) => {
                      setAccount(h);
                      setContact(null); // a contact belongs to one account — reset on change
                    }}
                    invalid={errorFields.has(accountContact.accountColumn)}
                    placeholder="Search accounts by name…"
                  />
                  <RecordPicker
                    // Remount on account change so the picker's internal query/results reset.
                    key={account?.sf_id ?? "no-account"}
                    name={accountContact.contactColumn}
                    label={accountContact.contactLabel ?? "Contact"}
                    endpoint={accountContact.contactEndpoint}
                    value={contact}
                    onChange={setContact}
                    disabled={!account}
                    disabledHint="Choose an account first"
                    queryParams={account ? { account: account.sf_id } : undefined}
                    invalid={errorFields.has(accountContact.contactColumn)}
                    placeholder="Search contacts by name…"
                  />
                </>
              )}
              {list.map((f) => {
                const value = values[f.column] ?? "";
                const invalid = errorFields.has(f.column);
                if (pickerSet.has(f.column) && renderPicker) {
                  return <div key={f.column}>{renderPicker({ field: f, value, invalid })}</div>;
                }
                return (
                  <FieldInput
                    key={f.column}
                    field={f}
                    value={value}
                    onChange={(v) => setField(f.column, v)}
                    invalid={invalid}
                    options={fieldOptions?.[f.column]}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="flex items-center gap-3 sticky bottom-0 bg-fcr-paper/95 backdrop-blur border-t border-fcr-line py-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-fcr-red hover:bg-fcr-red-dark disabled:opacity-60 transition-colors text-white font-semibold rounded-md px-6 py-2.5 uppercase tracking-wider text-sm"
        >
          {pending ? "Saving…" : mode === "create" ? labels.create : labels.edit}
        </button>
        {duplicates.length > 0 && (
          // The submit button carries the override flag as its OWN name/value, so it is in the
          // submitted FormData on the FIRST click. A controlled hidden input driven by a click
          // handler is NOT — React flushes the state update after the browser has already
          // serialized the form, so the first click would submit blank and appear to do nothing.
          <button
            type="submit"
            name="__confirm_duplicate"
            value="1"
            disabled={pending}
            className="border border-fcr-amber text-fcr-ink hover:bg-fcr-amber/20 disabled:opacity-60 transition-colors font-semibold rounded-md px-4 py-2.5 uppercase tracking-wider text-sm"
          >
            Create anyway
          </button>
        )}
        <a href={cancelHref} className="text-sm text-fcr-steel hover:text-fcr-ink">Cancel</a>
      </div>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  invalid,
  options,
}: {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  options?: string[];
}) {
  const selectOptions = options ?? field.options ?? [];
  const base = `w-full bg-white border rounded-md px-3 py-2 text-sm text-fcr-ink focus:outline-none focus:ring-2 focus:ring-fcr-red/20 ${
    invalid ? "border-fcr-red" : "border-fcr-line focus:border-fcr-red"
  }`;
  const isWide = field.input === "textarea";
  // Controlled (value + onChange) so the value survives React 19's post-action form reset — see UnitForm.
  return (
    <div className={isWide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <label htmlFor={field.column} className="block text-[10px] uppercase tracking-wider text-fcr-steel font-bold mb-1">
        {field.label}
      </label>
      {field.input === "select" ? (
        <select id={field.column} name={field.column} value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          {selectOptions.map((o) => (
            <option key={o} value={o}>{o === "" ? "—" : o}</option>
          ))}
        </select>
      ) : field.input === "textarea" ? (
        <textarea id={field.column} name={field.column} value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={base} />
      ) : (
        <input
          id={field.column}
          name={field.column}
          type={field.input === "date" ? "date" : field.input === "number" ? "number" : "text"}
          step={field.input === "number" ? "any" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}
    </div>
  );
}
