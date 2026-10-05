import { type BlobUploadFn } from "./blob-upload.js";
export type { BlobUploadFn };
export type FinalizePhotoFn = (input: {
    unitType: "truck" | "trailer";
    unitId: string;
    blobUrl: string;
    blobPathname: string;
    contentType: string;
    byteSize: number;
    caption: string | null;
}) => Promise<{
    ok: boolean;
    errors?: string[];
}>;
export interface PhotoUploadFormProps {
    unitType: "truck" | "trailer";
    unitId: string;
    upload: BlobUploadFn;
    finalize: FinalizePhotoFn;
    /** The app's client-upload token route for photos. */
    uploadUrl?: string;
}
export default function PhotoUploadForm({ unitType, unitId, upload, finalize, uploadUrl, }: PhotoUploadFormProps): import("react").JSX.Element;
//# sourceMappingURL=photo-upload-form.d.ts.map