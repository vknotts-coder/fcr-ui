"use client";

// PhotoUploadForm — the shared photo upload control ('use client'), fcr-trailers #48 slice 4. A thin
// wrapper over the shared useBlobUpload hook + UploadFormView (blob-upload.tsx) — the photo sibling of
// FileUploadForm, differing only in the config it supplies (image-only ceilings, the unit-photos/
// prefix, a caption field instead of purpose, image-only copy). The app injects `upload` + the photo
// `finalize` action. Ceilings from @fcr/core/uploads.
import { useState } from "react";
import { MAX_PHOTO_BYTES, PHOTO_ALLOWED_TYPES } from "@fcr/core/uploads";
import { useBlobUpload, UploadFormView, type BlobUploadFn } from "./blob-upload.js";

export type { BlobUploadFn };

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

export default function PhotoUploadForm({
  unitType,
  unitId,
  upload,
  finalize,
  uploadUrl = "/api/records/photo",
}: PhotoUploadFormProps) {
  const [caption, setCaption] = useState("");
  const state = useBlobUpload({
    unitType,
    unitId,
    upload,
    finalize,
    uploadUrl,
    prefix: "unit-photos",
    allowed: PHOTO_ALLOWED_TYPES,
    maxBytes: MAX_PHOTO_BYTES,
    defaultName: "photo.jpg",
    noun: "photo",
    badTypeMessage: "Photo must be a JPEG, PNG, HEIC, or WebP image.",
    buildPayload: (m) => ({
      unitType,
      unitId,
      blobUrl: m.blobUrl,
      blobPathname: m.blobPathname,
      contentType: m.contentType,
      byteSize: m.byteSize,
      caption: caption.trim() || null,
    }),
    onSuccess: () => setCaption(""),
  });

  return (
    <UploadFormView
      headerLabel="Upload a photo"
      accept={ACCEPT}
      fileAriaLabel="Photo"
      extra={{ ariaLabel: "Caption", placeholder: "caption (optional)", value: caption, onChange: setCaption }}
      helperText={`JPEG, PNG, HEIC, or WebP, up to ${state.maxMb} MB.`}
      state={state}
    />
  );
}
