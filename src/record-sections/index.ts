// @fcr/ui/record-sections — per-user collapsible + rearrangeable record-page sections (epic fcr-trailers#103).
// A 'use client' layout component; the pure state logic is exported too for the consuming app's tests.

export { RecordSections, type SectionItem, type RecordSectionsActions } from "./record-sections.js";
export {
  moveSection,
  toggleCollapsed,
  serializeSections,
  sameSectionState,
  reconcileSections,
  type SectionMeta,
} from "./section-state.js";
