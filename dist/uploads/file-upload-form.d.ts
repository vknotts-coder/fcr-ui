import { type BlobUploadFn } from "./blob-upload.js";
export type { BlobUploadFn };
export type FinalizeUploadFn = (input: {
    unitType: "truck" | "trailer";
    unitId: string;
    filename: string;
    blobUrl: string;
    blobPathname: string;
    contentType: string;
    byteSize: number;
    purpose: string | null;
}) => Promise<{
    ok: boolean;
    errors?: string[];
}>;
export interface FileUploadFormProps {
    unitType: "truck" | "trailer";
    unitId: string;
    upload: BlobUploadFn;
    finalize: FinalizeUploadFn;
    /** The app's client-upload token route. Both apps mount it at the same path. */
    uploadUrl?: string;
}
export default function FileUploadForm({ unitType, unitId, upload, finalize, uploadUrl, }: FileUploadFormProps): import("react").JSX.Element;
//# sourceMappingURL=file-upload-form.d.ts.map