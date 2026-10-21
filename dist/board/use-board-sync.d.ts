export declare function useBoardSync<T extends {
    id: string;
}>(initialCards: T[]): {
    cards: T[];
    setCards: import("react").Dispatch<import("react").SetStateAction<T[]>>;
    pending: Set<string>;
    setPendingFor: (ids: string | string[], on: boolean) => void;
};
//# sourceMappingURL=use-board-sync.d.ts.map