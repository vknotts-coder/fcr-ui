"use client";

// MultiIntakeForm (#141 S2) — the create-multiple intake form: one customer/contact, one-or-many
// units, in a single submit. Wraps the CustomerContactFields header (pick-or-new) over an N-unit
// repeater of the SAME field config the single UnitForm uses, then a review. Submits to an injected
// app server action that de-prefixes the units and calls @fcr/core/intake v0.18.0 createUnits.
//
// TWO VIEW MODES (Van, 2026-09-16), one implementation: "scroll" shows all three sections at once;
// "wizard" shows one step at a time with Back/Next. All sections stay MOUNTED in both modes (wizard
// just visually hides the others), so every field submits regardless of which step is visible and
// state never resets between steps.
//
// SUBMITTED FIELD CONTRACT (the app action reads these):
//   customer_* / contact_*  — see customer-select.tsx
//   unit_count = N
//   unit_<i>_<column>       — each unit's own fields (NOT the customer/contact ref columns; the
//                             engine's createUnits injects those from the shared header)
//   __confirm_duplicate=1   — carried by "Create anyway" to override a dedupe block

import { useActionState, useState, type ReactNode } from "react";
import { SECTION_ORDER, SECTION_TITLES, type FormField, type DuplicateHit } from "@fcr/core/intake";
import {
  CustomerContactFields,
  type CustomerSelection,
  type ContactSelection,
  emptyNewContact,
} from "./customer-select.js";

/** Per-unit and form-level errors/dedupe the batch action returns (index = which unit, null = form). */
export interface MultiFormState {
  errors?: { index: number | null; field: string | null; message: string }[];
  duplicates?: { index: number; hits: DuplicateHit[] }[];
}

type Action = (prev: MultiFormState, formData: FormData) => Promise<MultiFormState>;
type UnitValues = Record<string, string>;

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

const btnPrimary =
  "bg-fcr-red hover:bg-fcr-red-dark disabled:opacity-60 transition-colors text-white font-semibold rounded-md px-6 py-2.5 uppercase tracking-wider text-sm";
const btnGhost =
  "border border-fcr-line text-fcr-ink hover:bg-fcr-paper transition-colors font-semibold rounded-md px-4 py-2.5 uppercase tracking-wider text-sm";

export default function MultiIntakeForm({
  action,
  fields,
  customerRefColumn,
  contactRefColumn,
  accountEndpoint,
  contactEndpoint,
  cancelHref,
  unitLabel,
  submitLabel,
}: MultiIntakeFormProps) {
  const [state, formAction, pending] = useActionState(action, {} as MultiFormState);
  const errors = state.errors ?? [];
  const duplicates = state.duplicates ?? [];
  const hasDuplicates = duplicates.length > 0;

  const [mode, setMode] = useState<"scroll" | "wizard">("scroll");
  const [step, setStep] = useState(0); // wizard step: 0 customer/contact · 1 units · 2 review

  const [customer, setCustomer] = useState<CustomerSelection>({ mode: "existing", account: null });
  const [contact, setContact] = useState<ContactSelection>({ mode: "existing", ref: "" });
  const [units, setUnits] = useState<UnitValues[]>([{}]);

  // The per-unit fields exclude the customer/contact ref columns (the header resolves those; the
  // engine injects them into each unit) and any status/derived column the engine seeds.
  const unitFields = fields.filter((f) => f.column !== customerRefColumn && f.column !== contactRefColumn);
  const errorFieldsFor = (index: number | null) =>
    new Set(errors.filter((e) => e.index === index).map((e) => e.field).filter(Boolean) as string[]);

  const setUnit = (i: number, col: string, v: string) =>
    setUnits((prev) => prev.map((u, j) => (j === i ? { ...u, [col]: v } : u)));
  const addUnit = () => setUnits((prev) => [...prev, {}]);
  const removeUnit = (i: number) => setUnits((prev) => (prev.length === 1 ? prev : prev.filter((_, j) => j !== i)));

  const customerName = customer.mode === "new" ? customer.name || "(new customer)" : customer.account?.name || "(none selected)";

  // Section visibility: wizard shows only `step`; scroll shows all. Non-current sections stay mounted
  // (hidden) so their inputs still submit and their state survives.
  const show = (s: number) => (mode === "scroll" ? "" : step === s ? "" : "hidden");

  return (
    <form action={formAction} className="space-y-5">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-md border border-fcr-line overflow-hidden text-xs font-semibold uppercase tracking-wide">
          <button type="button" onClick={() => setMode("scroll")} className={`px-3 py-1.5 ${mode === "scroll" ? "bg-fcr-ink text-white" : "bg-white text-fcr-steel hover:text-fcr-ink"}`}>All on one page</button>
          <button type="button" onClick={() => setMode("wizard")} className={`px-3 py-1.5 border-l border-fcr-line ${mode === "wizard" ? "bg-fcr-ink text-white" : "bg-white text-fcr-steel hover:text-fcr-ink"}`}>Step by step</button>
        </div>
        {mode === "wizard" && (
          <div className="text-xs uppercase tracking-wide text-fcr-steel">Step {step + 1} of 3 · {["Customer & contact", "Units", "Review"][step]}</div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="bg-fcr-red/10 border border-fcr-red/40 rounded-xl p-4" role="alert">
          <div className="text-sm font-semibold text-fcr-red mb-1">Please fix the following:</div>
          <ul className="list-disc list-inside text-sm text-fcr-red space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>{e.index != null ? `${unitLabel} ${e.index + 1}: ` : ""}{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step 1 — customer & contact */}
      <div className={show(0)}>
        <SectionHeading n={1}>Customer &amp; contact</SectionHeading>
        <input type="hidden" name="unit_count" value={units.length} />
        <CustomerContactFields
          accountEndpoint={accountEndpoint}
          contactEndpoint={contactEndpoint}
          customer={customer}
          onCustomer={setCustomer}
          contact={contact}
          onContact={setContact}
          invalidFields={errorFieldsFor(null)}
        />
      </div>

      {/* Step 2 — the units */}
      <div className={show(1)}>
        <SectionHeading n={2}>{unitLabel === "truck" ? "Trucks" : unitLabel === "trailer" ? "Trailers" : "Units"}</SectionHeading>
        <div className="space-y-4">
          {units.map((u, i) => {
            const dupHit = duplicates.find((d) => d.index === i);
            return (
              <div key={i} className="bg-white border border-fcr-line rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm uppercase tracking-wide text-fcr-ink font-bold">{unitLabel} {i + 1}</h3>
                  {units.length > 1 && (
                    <button type="button" onClick={() => removeUnit(i)} className="text-[11px] font-semibold uppercase tracking-wide text-fcr-steel hover:text-fcr-red">Remove</button>
                  )}
                </div>
                {dupHit && (
                  <div className="bg-fcr-amber/10 border border-fcr-amber/50 rounded-lg p-3 text-sm">
                    <div className="font-semibold text-fcr-ink mb-1">Possible duplicate:</div>
                    <ul className="space-y-0.5">
                      {dupHit.hits.map((h) => (
                        <li key={`${h.unitType}:${h.id}`} className="flex items-center gap-2">
                          <span className="font-medium">{h.sfName ?? "(no unit #)"}</span>
                          <span className="text-fcr-steel">· {h.matchedOn}</span>
                          <a href={`/records/${h.unitType}/${h.id}`} className="text-fcr-red underline ml-1">Open</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <UnitFields fields={unitFields} prefix={`unit_${i}_`} values={u} onChange={(col, v) => setUnit(i, col, v)} invalid={errorFieldsFor(i)} />
              </div>
            );
          })}
          <button type="button" onClick={addUnit} className={btnGhost}>+ Add {unitLabel}</button>
        </div>
      </div>

      {/* Step 3 — review */}
      <div className={show(2)}>
        <SectionHeading n={3}>Review</SectionHeading>
        <div className="bg-white border border-fcr-line rounded-2xl p-4 text-sm text-fcr-ink space-y-2">
          <div><span className="text-fcr-steel">Customer:</span> <span className="font-medium">{customerName}</span>{customer.mode === "new" && <span className="ml-1 text-[10px] uppercase tracking-wide text-fcr-red">new</span>}</div>
          <div><span className="text-fcr-steel">{units.length} {unitLabel}{units.length === 1 ? "" : "s"}:</span></div>
          <ul className="list-disc list-inside text-fcr-steel">
            {units.map((u, i) => (
              <li key={i}>{u.sf_name || `${unitLabel} ${i + 1}`}{u.vin || u.full_vin ? ` · VIN ${u.vin || u.full_vin}` : ""}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 sticky bottom-0 bg-fcr-paper/95 backdrop-blur border-t border-fcr-line py-3">
        {mode === "wizard" && step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className={btnGhost}>Back</button>
        )}
        {mode === "wizard" && step < 2 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className={btnPrimary}>Next</button>
        ) : (
          <>
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "Saving…" : (submitLabel ?? `Create ${units.length} ${unitLabel}${units.length === 1 ? "" : "s"}`)}
            </button>
            {hasDuplicates && (
              <button type="submit" name="__confirm_duplicate" value="1" disabled={pending} className="border border-fcr-amber text-fcr-ink hover:bg-fcr-amber/20 disabled:opacity-60 transition-colors font-semibold rounded-md px-4 py-2.5 uppercase tracking-wider text-sm">
                Create anyway
              </button>
            )}
          </>
        )}
        <a href={cancelHref} className="text-sm text-fcr-steel hover:text-fcr-ink">Cancel</a>
      </div>
    </form>
  );
}

function SectionHeading({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-fcr-ink text-white text-xs font-bold">{n}</span>
      <h2 className="text-sm uppercase tracking-wide text-fcr-ink font-bold">{children}</h2>
    </div>
  );
}

function UnitFields({ fields, prefix, values, onChange, invalid }: { fields: FormField[]; prefix: string; values: UnitValues; onChange: (col: string, v: string) => void; invalid: Set<string> }) {
  const bySection = new Map<string, FormField[]>();
  for (const f of fields) {
    const list = bySection.get(f.section) ?? [];
    list.push(f);
    bySection.set(f.section, list);
  }
  return (
    <div className="space-y-3">
      {SECTION_ORDER.map((section) => {
        const list = bySection.get(section) ?? [];
        if (list.length === 0) return null;
        return (
          <div key={section}>
            <div className="text-[10px] uppercase tracking-wider text-fcr-steel font-bold mb-1.5">{SECTION_TITLES[section]}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
              {list.map((f) => {
                const name = `${prefix}${f.column}`;
                const value = values[f.column] ?? "";
                const isInvalid = invalid.has(f.column);
                const base = `w-full bg-white border rounded-md px-3 py-2 text-sm text-fcr-ink focus:outline-none focus:ring-2 focus:ring-fcr-red/20 ${isInvalid ? "border-fcr-red" : "border-fcr-line focus:border-fcr-red"}`;
                const wide = f.input === "textarea";
                return (
                  <div key={f.column} className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
                    <label htmlFor={name} className="block text-[10px] uppercase tracking-wider text-fcr-steel font-bold mb-1">{f.label}</label>
                    {f.input === "select" ? (
                      <select id={name} name={name} value={value} onChange={(e) => onChange(f.column, e.target.value)} className={base}>
                        {(f.options ?? []).map((o) => <option key={o} value={o}>{o === "" ? "—" : o}</option>)}
                      </select>
                    ) : f.input === "textarea" ? (
                      <textarea id={name} name={name} value={value} onChange={(e) => onChange(f.column, e.target.value)} rows={2} className={base} />
                    ) : (
                      <input id={name} name={name} type={f.input === "date" ? "date" : f.input === "number" ? "number" : "text"} step={f.input === "number" ? "any" : undefined} value={value} onChange={(e) => onChange(f.column, e.target.value)} className={base} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
