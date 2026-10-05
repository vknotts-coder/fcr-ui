import { type ReactNode, type RefObject } from "react";
export type BlobUploadFn = (pathname: string, file: File, options: {
    access: "public";
    contentType?: string;
    handleUploadUrl: string;
    clientPayload?: string;
}) => Promise<{
    url: string;
    pathname: string;
}>;
export type UploadActionResult = {
    ok: boolean;
    errors?: string[];
};
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
    pending: boolean;
    maxMb: number;
    submit: () => void;
};
export declare function useBlobUpload<P>(opts: UseBlobUploadOpts<P>): UseBlobUpload;
export declare function UploadFormView(props: {
    headerLabel: string;
    accept: string;
    fileAriaLabel: string;
    extra: {
        ariaLabel: string;
        placeholder: string;
        value: string;
        onChange: (v: string) => void;
    };
    helperText: string;
    state: UseBlobUpload;
}): ReactNode;
//# sourceMappingURL=blob-upload.d.ts.map