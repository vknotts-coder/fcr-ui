// @fcr/ui/board — the shared drag-tile-board shell: the generic pieces the fleet's status/estimator/team
// boards duplicated. HScrollBoard (horizontal scroll + arrows + drag-auto-scroll) is 'use client';
// useBoardSync is a 'use client' hook (optimistic cards + pending set + idle-resync); BoardBanner is a plain
// presentational error/info strip. The board-SPECIFIC grouping, lanes/columns, drop-legality and write
// actions stay in each consuming app — only the duplicated scaffolding lives here.
export { HScrollBoard } from "./hscroll-board.js";
export { useBoardSync } from "./use-board-sync.js";
export { BoardBanner } from "./board-banner.js";
