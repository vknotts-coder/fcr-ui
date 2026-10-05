"use client";

// PhotoUploadForm — the shared photo upload control ('use client'), the photo sibling of
// FileUploadForm (fcr-trailers #48 slice 4). Uploads the bytes DIRECTLY to Vercel Blob via the
// injected @fcr/blob/client `upload()` — client-direct matters more for photos (phone shots are
// routinely >4.5 MB, the serverless body cap a server-proxied upload would 413 at). Stored
// access:"public"; the app surfaces only its auth-gated proxy. The app's photo token route enforces
// auth + the image type/size ceilings; the injected `finalize` action records the fcr_core.unit_photo
// row. Ceilings import from @fcr/core/uploads — one source of truth with the write core.
//
// Seams mirror FileUploadForm: the app injects `upload` + `finalize`, so @fcr/ui imports no app code
// and needs no @vercel/blob dependency. A caption (free text) replaces the file form's purpose.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MAX_PHOTO_BYTES, PHOTO_ALLOWED_TYPES } from "@fcr/core/uploads";

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

export type FinalizePhotoFn = (input: {
  unitType: "truck" | "trailer";
  unitId: string;
  blobUrl: string;
  blobPathname: string;
  contentType: string;
  byteSize: number;
  caption: string | null;
}) => Promise<{ ok: boolean; errors?: string[] }>;

export interface PhotoUploadFormProps {
  unitType: "truck" | "trailer";
  unitId: string;
  upload: BlobUploadFn;
  finalize: FinalizePhotoFn;
  /** The app's client-upload token route for photos. */
  uploadUrl?: string;
}

const ACCEPT = PHOTO_ALLOWED_TYPES.join(",");
const MAX_MB = Math.round(MAX_PHOTO_BYTES / (1024 * 1024));

export default function PhotoUploadForm({
  unitType,
  unitId,
  upload,
  finalize,
  uploadUrl = "/api/records/photo",
}: PhotoUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    setOk(false);
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a photo first.");
      return;
    }
    // Friendly client-side checks; the token route re-enforces both at the Blob edge.
    if (!(PHOTO_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      setError("Photo must be a JPEG, PNG, HEIC, or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(`Photo is too large (max ${MAX_MB} MB).`);
      return;
    }

    const safeName = (file.name || "photo.jpg").replace(/[^\w.\-]/g, "_").slice(-100) || "photo.jpg";
    const pathname = `unit-photos/${unitType}/${unitId}/${Date.now()}-${safeName}`;

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
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          contentType: file.type,
          byteSize: file.size,
          caption: caption.trim() || null,
        });
        if (!res.ok) {
          setError(res.errors?.join(" ") || "Could not save the photo.");
          return;
        }
        setOk(true);
        setCaption("");
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
      <div className="text-[11px] uppercase tracking-widest text-fcr-steel">Upload a photo</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          ref={inputRef}
          type="file"
          aria-label="Photo"
          accept={ACCEPT}
          className="text-sm file:mr-2 file:rounded file:border-0 file:bg-fcr-ink file:text-white file:px-3 file:py-1 file:text-xs"
        />
        <input
          aria-label="Caption"
          placeholder="caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
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
      <p className="text-[11px] text-fcr-steel">JPEG, PNG, HEIC, or WebP, up to {MAX_MB} MB.</p>
    </div>
  );
}
