import type { Zone, ZoneType } from '@garden-planner/shared';
import { zoneTypeLabel } from './zone-style.js';

/** The default name of the next zone of `type`: `"<type label> <n>"`, so the first bed is "Bed 1". */
export function nextZoneName(zones: readonly Zone[], type: ZoneType): string {
  // Counted by type, not by position in the list: the second bed is "Bed 2" even when a path was drawn between
  // the two. The count is of the zones that exist now, so deleting "Bed 1" of two makes the next bed "Bed 2"
  // again — the rule the task names. Names label the list; the id identifies a zone.
  const sameType = zones.filter((zone) => zone.type === type).length;
  return `${zoneTypeLabel(type)} ${sameType + 1}`;
}
