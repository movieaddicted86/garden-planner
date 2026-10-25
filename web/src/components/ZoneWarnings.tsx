import { findZoneWarnings, type Project } from '@garden-planner/shared';

/** The sentence of one warning, in words with the zone names the user sees in the list (D6). */
function warningText(project: Project, warning: ReturnType<typeof findZoneWarnings>[number]): string {
  const nameOf = (id: string) => project.zones.find((zone) => zone.id === id)?.name ?? id;
  return warning.kind === 'overlap'
    ? `${nameOf(warning.zoneA)} overlaps ${nameOf(warning.zoneB)}`
    : `${nameOf(warning.zone)} is outside the base area`;
}

/** The props of the warning list: the project whose zones are judged. */
export interface ZoneWarningsProps {
  readonly project: Project;
}

/**
 * The warnings of the plan (D6): overlaps and zones that leave the base area, each as one sentence naming the
 * zones. `findZoneWarnings` owns which warnings there are and in which order; this only puts them into words.
 *
 * A warning is not an error: the zones keep their figures and nothing is clipped — the text says what the plan
 * does. The list is not rendered at all when there is nothing to warn about, so an empty list never looks like a
 * loading state.
 */
export function ZoneWarnings({ project }: ZoneWarningsProps) {
  const warnings = findZoneWarnings(project);
  if (warnings.length === 0) return null;

  return (
    <ul className="zone-warnings" data-testid="zone-warnings">
      {warnings.map((warning, index) => (
        // Two warnings can be about the same pair in the same way only once, so the index is a stable key here
        <li key={index} className="zone-warning" data-testid="zone-warning">
          {warningText(project, warning)}
        </li>
      ))}
    </ul>
  );
}
