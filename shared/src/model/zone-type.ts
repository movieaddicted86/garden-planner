/**
 * The zone types of D7, in the order a picker lists them. The stored value is the plain string, so a project
 * file stays readable and an unknown value can be detected instead of being cast.
 */
export const ZONE_TYPES = ['path', 'patio', 'bed', 'gravel', 'lawn', 'tree_pit', 'parking'] as const;

/** One of the seven zone types of D7. */
export type ZoneType = (typeof ZONE_TYPES)[number];

/**
 * `true` when `value` is one of `ZONE_TYPES`. The guard is what a parsed project file is narrowed with (D12),
 * where the type is `unknown` and the seven values are the only usable ones.
 */
export function isZoneType(value: unknown): value is ZoneType {
  return ZONE_TYPES.some((zoneType) => zoneType === value);
}
