"use client";

// Shared client-direct upload machinery for the record upload forms (fcr-trailers #48). The file and
// photo forms were ~95% identical (review of #10); the drift-prone orchestration — the
// upload()→finalize()→router.refresh() control flow and the presentational shell — now lives ONCE here,
// and FileUploadForm / PhotoUploadForm are thin wrappers that supply the per-kind config (ceilings,
// prefix, the extra text field, the finalize payload, copy). Same seam philosophy as the forms: the
// app injects `upload` + `finalize`, so @fcr/ui needs no @vercel/blob dependency.
import { useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { resolveContentType } from "@fcr/core/uploads";

// Error taxonomy (fcr-trailers #49): the bare catch used to collapse every failure into "Upload failed.
// Try again.", so a non-retryable auth/config rejection looked identical to a transient network blip. A
// non-retryable failure is a 4xx — the client-upload token route (@fcr/core onBeforeGenerateToken + the
// per-app authorize seam) returns 400 with a user-meaningful reason ("Not authorized.", "Not signed in.",
// "… is not enabled.", "Bad unit reference.", …); 5xx / network is transient → the generic retry message.
//
// PRIMARY signal is the HTTP status the blob client surfaces on the thrown error — structural, so it does
// NOT drift when a server message is reworded. We can't import @vercel/blob's error types (@fcr/ui stays
// blob-free), so we DUCK-TYPE `status`/`statusCode`. Only when no status is present (opaque/network) do we
// fall back to matching known non-retryable phrases — a best-effort last resort, not the contract.
const NON_RETRYABLE = /not authorized|not signed in|not enabled|bad unit|not under this unit|must be|too large/i;
function statusOf(err: unknown): number | undefined {
  const e = err as { status?: unknown; statusCode?: unknown } | null;
  if (typeof e?.status === "number") return e.status;
  if (typeof e?.statusCode === "number") return e.statusCode;
  return undefined;
}
function uploadErrorMessage(err: unknown, noun: string): string {
  const msg = err instanceof Error ? err.message : "";
  const status = statusOf(err);
  // 4xx = the request itself was rejected (auth/flag/validation) — won't change on retry; show the reason.
  if (status !== undefined && status >= 400 && status < 500 && msg) return msg;
  // No status to go on (network/opaque throw): fall back to the known non-retryable server phrases.
  if (status === undefined && msg && NON_RETRYABLE.test(msg)) return msg;
  // eslint-disable-next-line no-console
  console.error(`${noun} upload failed`, err); // keep the original for diagnosis; show a friendly retry
  return `Upload failed. Try again.`;
}

// Structural subset of @vercel/blob/client `upload()` the forms use — the single definition both
// forms import, so the seam can't drift between them. Returns at least the stored url + pathname.
export type BlobUploadFn = (
  pathname: string,
  file: File,
  options: {
    access: "public";
    contentType?: string;
    handleUploadUrl: string;
    clientPayload?: string;
  },
) => Promise<{ url: string; pathname: string }>;

export type UploadActionResult = { ok: boolean; errors?: string[] };

// Blob metadata handed to a form's buildPayload after the client-direct PUT resolves.
export type UploadedBlobMeta = {
  filename: string;
  blobUrl: string;
  blobPathname: string;
  contentType: string;
  byteSize: number;
};

export type UseBlobUploadOpts<P> = {
  unitType: "truck" | "trailer";
  unitId: string;
  upload: BlobUploadFn;
  finalize: (input: P) => Promise<UploadActionResult>;
  uploadUrl: string;
  /** Blob pathname prefix, e.g. "unit-files" | "unit-photos". */
  prefix: string;
  allowed: readonly string[];
  maxBytes: number;
  /** Fallback filename if the picked file has none, e.g. "receipt" | "photo.jpg". */
  defaultName: string;
  /** Noun for the friendly messages — "file" | "photo". */
  noun: string;
  /** The bad-content-type message (differs per kind's allowlist wording). */
  badTypeMessage: string;
  /** Turns the uploaded blob's metadata into the app finalize action's input. */
  buildPayload: (meta: UploadedBlobMeta) => P;
  /** Clear the form's own extra field (purpose/caption) on success. */
  onSuccess?: () => void;
};

export type UseBlobUpload = {
  inputRef: RefObject<HTMLInputElement | null>;
  error: string | null;
  ok: boolean;
  /** Aggregate success summary, e.g. "Uploaded 3 files." — null until a batch lands at least one file. */
  okMessage: string | null;
  pending: boolean;
  maxMb: number;
  submit: () => void;
};

// Multi-file batch limits. A bounded pool keeps a large multi-select (dozens of phone photos is realistic
// for a collision shop) from firing every upload+finalize at the token route / Neon pool / blob rate limit
// at once; MAX_BATCH_FILES caps the burst up front with a clear message rather than letting it degrade.
const UPLOAD_CONCURRENCY = 4;
const MAX_BATCH_FILES = 50;

// Minimal ordered concurrency pool (no dependency): run `fn` over `items` with at most `limit` in flight,
// results in input order. `fn` MUST resolve (never reject) — callers catch per item — so Promise.all can't
// abort the batch on one failure.
async function runPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function useBlobUpload<P>(opts: UseBlobUploadOpts<P>): UseBlobUpload {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const maxMb = Math.round(opts.maxBytes / (1024 * 1024));

  function submit() {
    setError(null);
    setOk(false);
    setOkMessage(null);
    const chosen = inputRef.current?.files;
    const files = chosen ? Array.from(chosen) : [];
    if (files.length === 0) {
      setError(`Choose a ${opts.noun} first.`);
      return;
    }
    if (files.length > MAX_BATCH_FILES) {
      setError(`Too many ${opts.noun}s at once — select at most ${MAX_BATCH_FILES}.`);
      return;
    }

    // Friendly client-side checks per file; the token route + write core re-enforce both at the Blob edge.
    // Browsers report an EMPTY file.type for valid PDFs/no-extension files and for HEIC on Chrome/Firefox,
    // so resolve the type from the extension when it's empty (#49) — the allowlist stays strict (no
    // empty-type hole). An invalid pick is set aside BY NAME and reported; the valid files still upload, so
    // one bad file in a multi-select doesn't sink the whole batch.
    const valid: { file: File; contentType: string }[] = [];
    const problems: string[] = [];
    for (const file of files) {
      const label = file.name || opts.defaultName;
      const contentType = resolveContentType(file.type, file.name);
      if (!contentType || !(opts.allowed as readonly string[]).includes(contentType)) {
        problems.push(`${label}: ${opts.badTypeMessage}`);
      } else if (file.size > opts.maxBytes) {
        problems.push(`${label}: too large (max ${maxMb} MB).`);
      } else {
        valid.push({ file, contentType });
      }
    }
    if (valid.length === 0) {
      setError(problems.join(" ") || opts.badTypeMessage);
      return;
    }

    start(async () => {
      // Upload + finalize each valid file through a BOUNDED pool (UPLOAD_CONCURRENCY in flight) so a big
      // multi-select doesn't swamp the token route / Neon pool / blob rate limit all at once. Each task
      // resolves to a tagged outcome and NEVER throws. The two failure kinds are kept distinct: a genuine
      // upload()/network rejection becomes a per-file reason via uploadErrorMessage (its HTTP-status
      // taxonomy), while an application-level finalize failure (`!res.ok`) carries the server's reason
      // VERBATIM — it has no HTTP status, so routing it through uploadErrorMessage would drop it to the
      // generic "try again" (the single-file path surfaced res.errors directly). A random token in the
      // pathname keeps same-named files picked in the same millisecond from colliding on the blob key.
      type Outcome = { ok: true; label: string } | { ok: false; label: string; reason: string };
      const outcomes = await runPool<{ file: File; contentType: string }, Outcome>(
        valid,
        UPLOAD_CONCURRENCY,
        async ({ file, contentType }) => {
          const label = file.name || opts.defaultName;
          const safeName = label.replace(/[^\w.\-]/g, "_").slice(-100) || opts.defaultName;
          const token = Math.random().toString(36).slice(2, 8);
          const pathname = `${opts.prefix}/${opts.unitType}/${opts.unitId}/${Date.now()}-${token}-${safeName}`;
          try {
            const blob = await opts.upload(pathname, file, {
              access: "public",
              contentType,
              handleUploadUrl: opts.uploadUrl,
              clientPayload: JSON.stringify({ unitType: opts.unitType, unitId: opts.unitId }),
            });
            const res = await opts.finalize(
              opts.buildPayload({
                filename: safeName,
                blobUrl: blob.url,
                blobPathname: blob.pathname,
                contentType,
                byteSize: file.size,
              }),
            );
            if (!res.ok) return { ok: false, label, reason: res.errors?.join(" ") || `Could not save ${safeName}.` };
            return { ok: true, label };
          } catch (err) {
            return { ok: false, label, reason: uploadErrorMessage(err, opts.noun) };
          }
        },
      );

      const failures = [...problems];
      let succeeded = 0;
      for (const o of outcomes) {
        if (o.ok) succeeded += 1;
        else failures.push(`${o.label}: ${o.reason}`);
      }

      if (succeeded > 0) {
        setOk(true);
        setOkMessage(`Uploaded ${succeeded} ${opts.noun}${succeeded === 1 ? "" : "s"}.`);
        // Clear the picker so a stray re-submit can't re-upload what just landed; `failures` names any that
        // did NOT land, so the user can re-pick just those (no duplicate rows for the ones that succeeded).
        if (inputRef.current) inputRef.current.value = "";
        opts.onSuccess?.();
        router.refresh();
      }
      setError(failures.length > 0 ? failures.join(" ") : null);
    });
  }

  return { inputRef, error, ok, okMessage, pending, maxMb, submit };
}

// The shared presentational shell (identical markup the two forms used). A form supplies its accept
// list, header/helper copy, the one extra text field (purpose/caption), and the hook outputs.
export function UploadFormView(props: {
  headerLabel: string;
  accept: string;
  fileAriaLabel: string;
  extra: { ariaLabel: string; placeholder: string; value: string; onChange: (v: string) => void };
  helperText: string;
  state: UseBlobUpload;
}): ReactNode {
  const { inputRef, error, ok, okMessage, pending, submit } = props.state;
  const field = "border-2 border-fcr-line rounded px-2 py-1 text-sm";
  return (
    <div className="mt-3 border-t border-fcr-line pt-3 space-y-3">
      <div className="text-[11px] uppercase tracking-widest text-fcr-steel">{props.headerLabel}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          aria-label={props.fileAriaLabel}
          accept={props.accept}
          className="text-sm file:mr-2 file:rounded file:border-0 file:bg-fcr-ink file:text-white file:px-3 file:py-1 file:text-xs"
        />
        <input
          aria-label={props.extra.ariaLabel}
          placeholder={props.extra.placeholder}
          value={props.extra.value}
          onChange={(e) => props.extra.onChange(e.target.value)}
          className={field}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          {error && <span className="text-fcr-red">{error}</span>}
          {ok && okMessage && <span className="text-green-700">{okMessage}</span>}
        </div>
        <button
          onClick={submit}
          disabled={pending}
          className="px-4 py-1.5 text-sm font-semibold bg-fcr-ink text-white rounded hover:bg-fcr-red disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
      <p className="text-[11px] text-fcr-steel">{props.helperText}</p>
    </div>
  );
}
