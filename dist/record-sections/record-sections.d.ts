import { type ReactNode } from "react";
/** One section to render: its key, heading, initial collapsed state, and server-rendered body. */
export type SectionItem = {
    key: string;
    title: string;
    collapsed: boolean;
    children: ReactNode;
};
export type RecordSectionsActions = {
    /** Persist the viewer's section arrangement ({ order, collapsed }). Does NOT revalidate (display pref). */
    onSave: (pref: {
        order: string[];
        collapsed: string[];
    }) => Promise<void>;
};
export declare function RecordSections({ sections, actions, pinnedKey, }: {
    /** Sections in resolved render order (pinned first), each with its initial collapsed flag + body. */
    sections: SectionItem[];
    actions: RecordSectionsActions;
    /** The section pinned first + not reorderable (still collapsible). Usually "information". */
    pinnedKey?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=record-sections.d.ts.map