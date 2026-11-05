import { type HideableColumn } from "./column-order.js";
export type { HideableColumn } from "./column-order.js";
export type ColumnControlActions = {
    /** Persist the user's arrangement (locked leaders first + never hidden). Revalidates so the grid re-renders. */
    onSave: (arrangement: {
        order: string[];
        hidden: string[];
    }) => Promise<void>;
    /** Clear the saved arrangement (reset to the view's default order, all visible). Revalidates. */
    onReset: () => Promise<void>;
};
export declare function ColumnControl({ columns, actions, lockedLeading, }: {
    /** The view's columns in CURRENT arranged order (locked leaders first), each with its hidden flag + label. */
    columns: HideableColumn[];
    actions: ColumnControlActions;
    /** How many leading columns are pinned + always-visible (not reorderable, not hideable). Default 1. */
    lockedLeading?: number;
}): import("react").JSX.Element;
//# sourceMappingURL=column-control.d.ts.map