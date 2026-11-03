export type OrderableColumn = {
    key: string;
    label: string;
};
export type ColumnOrderActions = {
    /** Persist the user's full column order (locked leaders first). Revalidates so the grid re-renders. */
    onSave: (orderedKeys: string[]) => Promise<void>;
    /** Clear the saved order (reset to the view's default). Revalidates. */
    onReset: () => Promise<void>;
};
export declare function ColumnOrderControl({ columns, actions, lockedLeading, }: {
    /** The view's columns in CURRENT display order (locked leaders first). */
    columns: OrderableColumn[];
    actions: ColumnOrderActions;
    /** How many leading columns are pinned (not reorderable). Default 1 (the record-link column). */
    lockedLeading?: number;
}): import("react").JSX.Element;
//# sourceMappingURL=column-order-control.d.ts.map