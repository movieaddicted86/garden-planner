import { isPolygonInside, polygonsOverlap } from '../geometry/polygon-overlap.js';
import type { Project } from './project.js';

/**
 * A remark about a project that does not stop the figures from being computed (D6): the zones are still
 * measured as drawn, the user is told what the plan does. `overlap` names two zone ids, `outside_base` one.
 */
export type ZoneWarning =
  | { kind: 'overlap'; zoneA: string; zoneB: string } // zone ids, in project order, once per pair
  | { kind: 'outside_base'; zone: string };

/** The zones that are not fully inside the base area, as `outside_base` warnings in zone order (D6). */
function findOutsideBaseWarnings(project: Project): ZoneWarning[] {
  const warnings: ZoneWarning[] = [];
  for (const zone of project.zones) {
    if (!isPolygonInside(zone.points, project.baseArea.points)) {
      warnings.push({ kind: 'outside_base', zone: zone.id });
    }
  }
  return warnings;
}

/** Every overlapping pair, once, as `overlap` warnings ordered by `(indexA, indexB)` (D6). */
function findOverlapWarnings(project: Project): ZoneWarning[] {
  const warnings: ZoneWarning[] = [];
  const zones = project.zones;
  for (let indexA = 0; indexA < zones.length; indexA += 1) {
    for (let indexB = indexA + 1; indexB < zones.length; indexB += 1) {
      if (polygonsOverlap(zones[indexA].points, zones[indexB].points)) {
        warnings.push({ kind: 'overlap', zoneA: zones[indexA].id, zoneB: zones[indexB].id });
      }
    }
  }
  return warnings;
}

/**
 * Everything the plan should be warned about (D6), `[]` when it is fine: first the zones that leave the base
 * area (in zone order), then the overlapping pairs ordered by `(indexA, indexB)` — the order is part of the
 * contract, so a caller can show the list without sorting it again. Each pair is reported once, with the ids in
 * project order.
 *
 * Pure (D11): the project is only read. Invalid zones (D5, a bow tie) produce whatever the even-odd rule says
 * instead of an error — a zone the user is already told is invalid must not also make the warning list fail.
 */
export function findZoneWarnings(project: Project): ZoneWarning[] {
  return [...findOutsideBaseWarnings(project), ...findOverlapWarnings(project)];
}
