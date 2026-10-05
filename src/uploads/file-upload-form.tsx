"use client";

// FileUploadForm — the shared record-file upload control ('use client'), extracted from fcr-dispatch
// for reuse in trailers (fcr-trailers #48 slice 1). Uploads the bytes DIRECTLY to Vercel Blob via the
// injected @vercel/blob/client `upload()` — the browser PUTs straight to Blob storage, so a 5–15 MB
// scanned receipt bypasses the ~4.5 MB serverless request-body cap that a server-proxied upload would
// 413 at the platform edge (round-1 review, HIGH). Stored access:"public" (the fcr1 Blob store is
// public-only) — the raw url is a capability the app never surfaces (only the auth-gated proxy is
// linked). The app's token route enforces auth + the type/size ceilings at issue time; the injected
// `finalize` action records the fcr_core.unit_file row.
//
// Seams (same injection pattern as @fcr/ui/intake's UnitForm): the app supplies `upload` (its own
// @fcr/blob/client upload) and `finalize` (its "use server" action), so @fcr/ui imports no app code
// and stays dependency-free. Ceilings come from @fcr/core/uploads — one source of truth with the
// write core that re-enforces them server-side.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MAX_FILE_BYTES, ALLOWED_TYPES } from "@fcr/core/uploads";

// Structural subset of @vercel/blob/client `upload()` the form uses — kept as a seam so @fcr/ui needs
// no @vercel/blob dependency (the app injects its own). Returns at least the stored url + pathname.
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

// The app's finalize server action — records the row from the already-uploaded blob's metadata.
export type FinalizeUploadFn = (input: {
  unitType: "truck" | "trailer";
  unitId: string;
  filename: string;
  blobUrl: string;
  blobPathname: string;
  contentType: string;
  byteSize: number;
  purpose: string | null;
}) => Promise<{ ok: boolean; errors?: string[] }>;

export interface FileUploadFormProps {
  unitType: "truck" | "trailer";
  unitId: string;
  upload: BlobUploadFn;
  finalize: FinalizeUploadFn;
  /** The app's client-upload token route. Both apps mount it at the same path. */
  uploadUrl?: string;
}

const ACCEPT = ALLOWED_TYPES.join(",");
// Display copy derived from the core ceiling so a MAX_FILE_BYTES bump can't silently drift the
// shown limit from the enforced one (the header's "one source of truth" claim, made literal).
const MAX_MB = Math.round(MAX_FILE_BYTES / (1024 * 1024));

export default function FileUploadForm({
  unitType,
  unitId,
  upload,
  finalize,
  uploadUrl = "/api/records/file",
}: FileUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    setOk(false);
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    // Friendly client-side checks; the token route re-enforces both at the Blob edge.
    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      setError("File must be a PDF or an image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`File is too large (max ${MAX_MB} MB).`);
      return;
    }

    const safeName = (file.name || "receipt").replace(/[^\w.\-]/g, "_").slice(-100) || "receipt";
    const pathname = `unit-files/${unitType}/${unitId}/${Date.now()}-${safeName}`;

    start(async () => {
      try {
        const blob = await upload(pathname, file, {
          access: "public",
          contentType: file.type,
          handleUploadUrl: uploadUrl,
          clientPayload: JSON.stringify({ unitType, unitId }),
        });
        const res = await finalize({
          unitType,
          unitId,
          filename: safeName,
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          contentType: file.type,
          byteSize: file.size,
          purpose,
        });
        if (!res.ok) {
          setError(res.errors?.join(" ") || "Could not save the file.");
          return;
        }
        setOk(true);
        setPurpose("");
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } catch {
        setError("Upload failed. Try again.");
      }
    });
  }

  const field = "border-2 border-fcr-line rounded px-2 py-1 text-sm";
  return (
    <div className="mt-3 border-t border-fcr-line pt-3 space-y-3">
      <div className="text-[11px] uppercase tracking-widest text-fcr-steel">Upload a receipt / file</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          ref={inputRef}
          type="file"
          aria-label="File"
          accept={ACCEPT}
          className="text-sm file:mr-2 file:rounded file:border-0 file:bg-fcr-ink file:text-white file:px-3 file:py-1 file:text-xs"
        />
        <input
          aria-label="Purpose"
          placeholder="purpose (e.g. tow bill for accounting)"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className={field}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          {error && <span className="text-fcr-red">{error}</span>}
          {ok && <span className="text-green-700">Uploaded.</span>}
        </div>
        <button
          onClick={submit}
          disabled={pending}
          className="px-4 py-1.5 text-sm font-semibold bg-fcr-ink text-white rounded hover:bg-fcr-red disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
      <p className="text-[11px] text-fcr-steel">PDF or image, up to {MAX_MB} MB.</p>
    </div>
  );
}
