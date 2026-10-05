"use client";

// FileUploadForm — the shared record-file upload control ('use client'), fcr-trailers #48 slice 1.
// Now a thin wrapper over the shared useBlobUpload hook + UploadFormView (blob-upload.tsx), which hold
// the upload→finalize→refresh orchestration and markup once so the file + photo forms can't drift.
// Seams unchanged: the app injects `upload` (@vercel/blob/client) + `finalize` (its "use server"
// action), so @fcr/ui needs no @vercel/blob dependency. Ceilings from @fcr/core/uploads — one source
// of truth with the write core that re-enforces them server-side.
import { useState } from "react";
import { MAX_FILE_BYTES, ALLOWED_TYPES } from "@fcr/core/uploads";
import { useBlobUpload, UploadFormView, type BlobUploadFn } from "./blob-upload.js";

export type { BlobUploadFn };

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

export default function FileUploadForm({
  unitType,
  unitId,
  upload,
  finalize,
  uploadUrl = "/api/records/file",
}: FileUploadFormProps) {
  const [purpose, setPurpose] = useState("");
  const state = useBlobUpload({
    unitType,
    unitId,
    upload,
    finalize,
    uploadUrl,
    prefix: "unit-files",
    allowed: ALLOWED_TYPES,
    maxBytes: MAX_FILE_BYTES,
    defaultName: "receipt",
    noun: "file",
    badTypeMessage: "File must be a PDF or an image.",
    buildPayload: (m) => ({
      unitType,
      unitId,
      filename: m.filename,
      blobUrl: m.blobUrl,
      blobPathname: m.blobPathname,
      contentType: m.contentType,
      byteSize: m.byteSize,
      purpose,
    }),
    onSuccess: () => setPurpose(""),
  });

  return (
    <UploadFormView
      headerLabel="Upload a receipt / file"
      accept={ACCEPT}
      fileAriaLabel="File"
      extra={{
        ariaLabel: "Purpose",
        placeholder: "purpose (e.g. tow bill for accounting)",
        value: purpose,
        onChange: setPurpose,
      }}
      helperText={`PDF or image, up to ${state.maxMb} MB.`}
      state={state}
    />
  );
}
