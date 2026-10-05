// @fcr/ui/uploads — the shared record-file upload control ('use client'), fcr-trailers #48 slice 1.
// The non-React cores (write/gc/token/proxy/del) live in @fcr/core/uploads; this is just the form.
// The app injects `upload` (@vercel/blob/client) + `finalize` (its "use server" action), so @fcr/ui
// imports no app code and needs no @vercel/blob dependency.
export { default as FileUploadForm, } from "./file-upload-form.js";
// Photo sibling (slice 4) — client-direct upload to unit_photo, with a caption field.
export { default as PhotoUploadForm, } from "./photo-upload-form.js";
