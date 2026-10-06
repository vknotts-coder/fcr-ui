"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Shared client-direct upload machinery for the record upload forms (fcr-trailers #48). The file and
// photo forms were ~95% identical (review of #10); the drift-prone orchestration — the
// upload()→finalize()→router.refresh() control flow and the presentational shell — now lives ONCE here,
// and FileUploadForm / PhotoUploadForm are thin wrappers that supply the per-kind config (ceilings,
// prefix, the extra text field, the finalize payload, copy). Same seam philosophy as the forms: the
// app injects `upload` + `finalize`, so @fcr/ui needs no @vercel/blob dependency.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveContentType } from "@fcr/core/uploads";
// Error taxonomy (fcr-trailers #49): the bare catch used to collapse every failure into "Upload failed.
// Try again.", so a non-retryable auth/config rejection looked identical to a transient network blip. The
// client-upload token route throws USER-MEANINGFUL messages from onBeforeGenerateToken ("Not authorized.",
// "Not signed in.", "… is not enabled.", "Bad unit reference.", …) and @vercel/blob surfaces that message
// on the thrown error — those are non-retryable, so show the real reason. Anything else (opaque / network /
// 5xx) is transient → the generic retry message. We can't import @vercel/blob's error types here (@fcr/ui
// stays blob-free), so we classify on the surfaced message, not an instanceof.
const NON_RETRYABLE = /not authorized|not signed in|not enabled|bad unit|not under this unit|must be|too large/i;
function uploadErrorMessage(err, noun) {
    const msg = err instanceof Error ? err.message : "";
    if (msg && NON_RETRYABLE.test(msg))
        return msg; // the server told us why; it won't change on retry
    // eslint-disable-next-line no-console
    console.error(`${noun} upload failed`, err); // keep the original for diagnosis; show a friendly retry
    return `Upload failed. Try again.`;
}
export function useBlobUpload(opts) {
    const inputRef = useRef(null);
    const [error, setError] = useState(null);
    const [ok, setOk] = useState(false);
    const [pending, start] = useTransition();
    const router = useRouter();
    const maxMb = Math.round(opts.maxBytes / (1024 * 1024));
    const Noun = opts.noun.charAt(0).toUpperCase() + opts.noun.slice(1);
    function submit() {
        setError(null);
        setOk(false);
        const file = inputRef.current?.files?.[0];
        if (!file) {
            setError(`Choose a ${opts.noun} first.`);
            return;
        }
        // Friendly client-side checks; the token route re-enforces both at the Blob edge. Browsers report an
        // EMPTY file.type for valid PDFs/no-extension files and for HEIC on Chrome/Firefox, so resolve the
        // type from the extension when it's empty (#49) — the allowlist stays strict (no empty-type hole), and
        // a concrete type is what we then send to the Blob edge + the finalize action so they agree.
        const contentType = resolveContentType(file.type, file.name);
        if (!contentType || !opts.allowed.includes(contentType)) {
            setError(opts.badTypeMessage);
            return;
        }
        if (file.size > opts.maxBytes) {
            setError(`${Noun} is too large (max ${maxMb} MB).`);
            return;
        }
        const safeName = (file.name || opts.defaultName).replace(/[^\w.\-]/g, "_").slice(-100) || opts.defaultName;
        const pathname = `${opts.prefix}/${opts.unitType}/${opts.unitId}/${Date.now()}-${safeName}`;
        start(async () => {
            try {
                const blob = await opts.upload(pathname, file, {
                    access: "public",
                    contentType,
                    handleUploadUrl: opts.uploadUrl,
                    clientPayload: JSON.stringify({ unitType: opts.unitType, unitId: opts.unitId }),
                });
                const res = await opts.finalize(opts.buildPayload({
                    filename: safeName,
                    blobUrl: blob.url,
                    blobPathname: blob.pathname,
                    contentType,
                    byteSize: file.size,
                }));
                if (!res.ok) {
                    setError(res.errors?.join(" ") || `Could not save the ${opts.noun}.`);
                    return;
                }
                setOk(true);
                if (inputRef.current)
                    inputRef.current.value = "";
                opts.onSuccess?.();
                router.refresh();
            }
            catch (err) {
                setError(uploadErrorMessage(err, opts.noun));
            }
        });
    }
    return { inputRef, error, ok, pending, maxMb, submit };
}
// The shared presentational shell (identical markup the two forms used). A form supplies its accept
// list, header/helper copy, the one extra text field (purpose/caption), and the hook outputs.
export function UploadFormView(props) {
    const { inputRef, error, ok, pending, submit } = props.state;
    const field = "border-2 border-fcr-line rounded px-2 py-1 text-sm";
    return (_jsxs("div", { className: "mt-3 border-t border-fcr-line pt-3 space-y-3", children: [_jsx("div", { className: "text-[11px] uppercase tracking-widest text-fcr-steel", children: props.headerLabel }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: [_jsx("input", { ref: inputRef, type: "file", "aria-label": props.fileAriaLabel, accept: props.accept, className: "text-sm file:mr-2 file:rounded file:border-0 file:bg-fcr-ink file:text-white file:px-3 file:py-1 file:text-xs" }), _jsx("input", { "aria-label": props.extra.ariaLabel, placeholder: props.extra.placeholder, value: props.extra.value, onChange: (e) => props.extra.onChange(e.target.value), className: field })] }), _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "text-sm", children: [error && _jsx("span", { className: "text-fcr-red", children: error }), ok && _jsx("span", { className: "text-green-700", children: "Uploaded." })] }), _jsx("button", { onClick: submit, disabled: pending, className: "px-4 py-1.5 text-sm font-semibold bg-fcr-ink text-white rounded hover:bg-fcr-red disabled:opacity-50", children: pending ? "Uploading…" : "Upload" })] }), _jsx("p", { className: "text-[11px] text-fcr-steel", children: props.helperText })] }));
}
