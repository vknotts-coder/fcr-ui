"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const ACCEPT = ALLOWED_TYPES.join(",");
// Display copy derived from the core ceiling so a MAX_FILE_BYTES bump can't silently drift the
// shown limit from the enforced one (the header's "one source of truth" claim, made literal).
const MAX_MB = Math.round(MAX_FILE_BYTES / (1024 * 1024));
export default function FileUploadForm({ unitType, unitId, upload, finalize, uploadUrl = "/api/records/file", }) {
    const inputRef = useRef(null);
    const [purpose, setPurpose] = useState("");
    const [error, setError] = useState(null);
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
        if (!ALLOWED_TYPES.includes(file.type)) {
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
                if (inputRef.current)
                    inputRef.current.value = "";
                router.refresh();
            }
            catch {
                setError("Upload failed. Try again.");
            }
        });
    }
    const field = "border-2 border-fcr-line rounded px-2 py-1 text-sm";
    return (_jsxs("div", { className: "mt-3 border-t border-fcr-line pt-3 space-y-3", children: [_jsx("div", { className: "text-[11px] uppercase tracking-widest text-fcr-steel", children: "Upload a receipt / file" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: [_jsx("input", { ref: inputRef, type: "file", "aria-label": "File", accept: ACCEPT, className: "text-sm file:mr-2 file:rounded file:border-0 file:bg-fcr-ink file:text-white file:px-3 file:py-1 file:text-xs" }), _jsx("input", { "aria-label": "Purpose", placeholder: "purpose (e.g. tow bill for accounting)", value: purpose, onChange: (e) => setPurpose(e.target.value), className: field })] }), _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "text-sm", children: [error && _jsx("span", { className: "text-fcr-red", children: error }), ok && _jsx("span", { className: "text-green-700", children: "Uploaded." })] }), _jsx("button", { onClick: submit, disabled: pending, className: "px-4 py-1.5 text-sm font-semibold bg-fcr-ink text-white rounded hover:bg-fcr-red disabled:opacity-50", children: pending ? "Uploading…" : "Upload" })] }), _jsxs("p", { className: "text-[11px] text-fcr-steel", children: ["PDF or image, up to ", MAX_MB, " MB."] })] }));
}
