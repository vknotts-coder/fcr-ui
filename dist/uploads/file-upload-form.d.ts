import { type BlobUploadFn } from "./blob-upload.js";
export type { BlobUploadFn };
export type FinalizeUploadFn = (input: {
    unitType: "truck" | "trailer" | "donor";
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
    unitType: "truck" | "trailer" | "donor";
    unitId: string;
    upload: BlobUploadFn;
    finalize: FinalizeUploadFn;
    /** The app's client-upload token route. Both apps mount it at the same path. */
    uploadUrl?: string;
    /**
     * When supplied, the extra field becomes a REQUIRED kind picker (a <select> of these options) instead of
     * the free-text purpose input, and the chosen value flows to `finalize` as `purpose`. Apps that name
     * uploads by kind (fcr-estimating #38) pass their kinds here; apps that want a free-text note omit it.
     */
    purposeOptions?: readonly {
        value: string;
        label: string;
    }[];
    /** Label/placeholder for the extra field; defaults suit the free-text purpose. */
    purposeLabel?: string;
    purposePlaceholder?: string;
}
export default function FileUploadForm({ unitType, unitId, upload, finalize, uploadUrl, purposeOptions, purposeLabel, purposePlaceholder, }: FileUploadFormProps): import("react").JSX.Element;
//# sourceMappingURL=file-upload-form.d.ts.map