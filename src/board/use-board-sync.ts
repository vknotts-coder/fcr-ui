"use client";

import { useState, useEffect } from "react";

// Shared optimistic-board state for the fleet's drag tile boards (extracted from the duplicated StatusBoard /
// EstimatorBoard scaffolding, fcr-estimating #18). Holds the card list + the in-flight `pending` id set, and
// re-syncs to fresh server props ONLY when idle — adopting new props mid-flight would clobber an optimistic
// move. When writes settle, the next server render reconciles.
export function useBoardSync<T extends { id: string }>(initialCards: T[]) {
  const [cards, setCards] = useState<T[]>(initialCards);
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (pending.size === 0) setCards(initialCards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCards]);

  // Mark one id or a batch pending/not — the shared helper both boards had their own copy of.
  const setPendingFor = (ids: string | string[], on: boolean) =>
    setPending((prev) => {
      const next = new Set(prev);
      for (const id of Array.isArray(ids) ? ids : [ids]) (on ? next.add(id) : next.delete(id));
      return next;
    });

  return { cards, setCards, pending, setPendingFor };
}
