import {
  formatArea,
  formatLength,
  polygonArea,
  polygonPerimeter,
  validatePolygon,
  type LengthUnit,
  type Zone,
} from '@garden-planner/shared';
import { zoneTypeLabel } from '../plan/zone-style.js';

/** The badge of a zone that crosses itself (D5); `duplicate_vertex` has its own words below. */
const INVALID_SELF_INTERSECTION = 'Invalid: crosses itself';
const INVALID_DUPLICATE_POINT = 'Invalid: repeated point';

/** Shown instead of a figure of a zone that is invalid: the numbers would describe an outline that has no area. */
const NO_FIGURE = '–';

/** The words for the first issue of an invalid zone (D5). */
function invalidLabel(zone: Zone): string {
  const [issue] = validatePolygon(zone.points);
  return issue?.kind === 'duplicate_vertex' ? INVALID_DUPLICATE_POINT : INVALID_SELF_INTERSECTION;
}

/**
 * The badge of an invalid zone. `validatePolygon` is `shared/`'s rule (D5): it decides both whether the zone is
 * invalid and which words the badge uses, so the list never contradicts the geometry.
 */
function InvalidBadge({ zone }: { readonly zone: Zone }) {
  return (
    <span className="zone-invalid-badge" data-testid="zone-invalid">
      {invalidLabel(zone)}
    </span>
  );
}

/** The area and the perimeter of a valid zone, or the placeholder when the zone is invalid (D5). */
function ZoneFigures({ zone, unit, valid }: { readonly zone: Zone; readonly unit: LengthUnit; readonly valid: boolean }) {
  return (
    <dl className="zone-figures">
      <dt>Area</dt>
      <dd data-testid="zone-area">{valid ? formatArea(polygonArea(zone.points)) : NO_FIGURE}</dd>
      <dt>Perimeter</dt>
      <dd data-testid="zone-perimeter">{valid ? formatLength(polygonPerimeter(zone.points), unit) : NO_FIGURE}</dd>
    </dl>
  );
}

/** The props of one list entry: the zone, the unit its perimeter is read in, the selection and the two handlers. */
export interface ZoneItemProps {
  readonly zone: Zone;
  readonly unit: LengthUnit;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onDelete: () => void;
}

/**
 * One entry of the zone list: name, type, the two figures and a Delete button. The whole entry is the selection
 * target — a button inside a button is invalid HTML, so the row is a `div` with a button-like role and the
 * keyboard handler that goes with it, and Delete is the only real control in it.
 *
 * An invalid zone (D5) shows the badge and **no** figures: its area is a number about an outline that crosses
 * itself, and showing it as valid would be worse than showing nothing.
 */
export function ZoneItem({ zone, unit, selected, onSelect, onDelete }: ZoneItemProps) {
  const valid = validatePolygon(zone.points).length === 0;
  return (
    <li className="zone-item" data-testid="zone-item" data-zone-id={zone.id} aria-current={selected ? 'true' : undefined}>
      <div
        className={selected ? 'zone-item-main zone-item-selected' : 'zone-item-main'}
        role="button"
        tabIndex={0}
        data-testid="zone-select"
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
          }
        }}
      >
        <span className="zone-item-name" data-testid="zone-name">
          {zone.name}
        </span>
        <span className="zone-item-type" data-testid="zone-type-label">
          {zoneTypeLabel(zone.type)}
        </span>
        {!valid && <InvalidBadge zone={zone} />}
        <ZoneFigures zone={zone} unit={unit} valid={valid} />
      </div>
      <button type="button" className="zone-delete" aria-label={`Delete ${zone.name}`} data-testid="zone-delete" onClick={onDelete}>
        Delete
      </button>
    </li>
  );
}
