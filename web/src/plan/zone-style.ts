import type { ZoneType } from '@garden-planner/shared';

/**
 * The label of every zone type (D7) — the one place a type is written as words. The select, the zone list and
 * the default zone name all read this table, so a new type shows up everywhere at once and no component holds a
 * second copy of "Tree pit".
 */
export const ZONE_TYPE_LABELS: Readonly<Record<ZoneType, string>> = {
  path: 'Path',
  patio: 'Patio',
  bed: 'Bed',
  gravel: 'Gravel',
  lawn: 'Lawn',
  tree_pit: 'Tree pit',
  parking: 'Parking',
};

/**
 * The CSS custom property a type draws in. The values live in `styles.css` (with a dark-mode variant), the names
 * only here: a component asks for the property, never for a colour, so a type is never drawn in two colours.
 */
export const ZONE_TYPE_COLOR_VARS: Readonly<Record<ZoneType, string>> = {
  path: '--zone-path',
  patio: '--zone-patio',
  bed: '--zone-bed',
  gravel: '--zone-gravel',
  lawn: '--zone-lawn',
  tree_pit: '--zone-tree-pit',
  parking: '--zone-parking',
};

/** The words for zone type `type` (D7). */
export function zoneTypeLabel(type: ZoneType): string {
  return ZONE_TYPE_LABELS[type];
}

/** The colour a zone of `type` is drawn in: `var(--zone-…)`, resolved by the stylesheet at render time. */
export function zoneColor(type: ZoneType): string {
  return `var(${ZONE_TYPE_COLOR_VARS[type]})`;
}
