import { useState } from 'react';
import {
  formatArea,
  formatLength,
  formatLengthValue,
  parseLength,
  polygonArea,
  polygonPerimeter,
  type LengthUnit,
} from '@garden-planner/shared';
import { boundsOf } from '../plan/viewport.js';
import { usePlanStore } from '../state/use-plan-store.js';
import { UnitToggle } from './UnitToggle.js';

/** The largest side the form accepts, in metres (AC-7): a garden is not a kilometre wide. */
const MAX_SIDE_METERS = 1000;

/** The one message a field shows; its text is part of AC-7. */
const SIDE_ERROR = 'Enter a number greater than 0 and at most 1000 m';

/** The text the user is typing, before Apply turns it into a stored size. */
interface Draft {
  readonly width: string;
  readonly height: string;
}

/**
 * The number of metres `text` stands for in `unit`, or `null` when it is not a usable side (AC-7): unreadable
 * text, zero, a negative value or more than `MAX_SIDE_METERS`. The judgement is `parseLength`'s — this only adds
 * the range a base area has to stay in, so the form and the model agree on what is a length.
 */
function validMeters(text: string, unit: LengthUnit): number | null {
  const meters = parseLength(text, unit);
  if (meters === null || meters <= 0 || meters > MAX_SIDE_METERS) {
    return null;
  }
  return meters;
}

/** The props of one side field; the unit is shown next to the input, not inside its value. */
interface LengthFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly unit: LengthUnit;
  readonly invalid: boolean;
  readonly onChange: (text: string) => void;
}

/**
 * One side of the rectangle form. The value is free text as typed — `parseLength` decides what it means, so the
 * field never rewrites the user's input while it is being typed. The unit stands next to the input because
 * `parseLength` rejects a unit suffix, and `formatLengthValue` is what fills the field from the stored metres.
 */
function LengthField({ id, label, value, unit, invalid, onChange }: LengthFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="length-field">
      <label className="length-field-label" htmlFor={id}>
        {label}
      </label>
      <span className="length-field-input">
        <input
          id={id}
          data-testid={id}
          className="length-input"
          type="text"
          inputMode="decimal"
          value={value}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="length-field-unit">{unit}</span>
      </span>
      {invalid && (
        <p className="length-field-error" id={errorId} role="alert" data-testid={errorId}>
          {SIDE_ERROR}
        </p>
      )}
    </div>
  );
}

/**
 * The base-area panel: the unit toggle, the rectangle form and the two figures of the stored base area. Every
 * number it shows comes from `shared/` (`formatLengthValue` for the fields, `formatArea`/`formatLength` for the
 * figures, `parseLength` for the input), so the unit toggle only changes how values are read and written — never
 * what is stored (D2). The form commits on Apply, not per keystroke: a half-typed "1" must not resize the garden.
 */
export function BaseAreaPanel() {
  const baseArea = usePlanStore((state) => state.project.baseArea);
  const displayUnit = usePlanStore((state) => state.project.displayUnit);
  const setDisplayUnit = usePlanStore((state) => state.setDisplayUnit);
  const setBaseAreaRectangle = usePlanStore((state) => state.setBaseAreaRectangle);

  // `null` as long as the fields show the stored size; the typed text while the user edits, until Apply or a unit
  // switch. Anything in between is derived, never stored: two copies of one size drift apart.
  const [draft, setDraft] = useState<Draft | null>(null);

  const bounds = boundsOf(baseArea.points);
  const widthText = draft?.width ?? formatLengthValue(bounds.maxX - bounds.minX, displayUnit);
  const heightText = draft?.height ?? formatLengthValue(bounds.maxY - bounds.minY, displayUnit);
  const widthMeters = validMeters(widthText, displayUnit);
  const heightMeters = validMeters(heightText, displayUnit);
  const invalid = widthMeters === null || heightMeters === null;

  /** A unit switch drops the draft: the typed text belongs to the unit it was typed in, not to the new one. */
  function changeUnit(unit: LengthUnit): void {
    setDraft(null);
    setDisplayUnit(unit);
  }

  function apply(): void {
    if (widthMeters === null || heightMeters === null) return;
    setBaseAreaRectangle(widthMeters, heightMeters);
    // the fields come back from the store, so they show the size the plan now has (rounded, in the current unit)
    setDraft(null);
  }

  return (
    <aside className="base-area-panel" aria-labelledby="base-area-heading">
      <h2 className="base-area-heading" id="base-area-heading">
        Base area
      </h2>
      <UnitToggle unit={displayUnit} onChange={changeUnit} />
      <div className="length-fields">
        <LengthField
          id="base-area-width"
          label="Width"
          value={widthText}
          unit={displayUnit}
          invalid={widthMeters === null}
          onChange={(width) => setDraft({ width, height: heightText })}
        />
        <LengthField
          id="base-area-height"
          label="Height"
          value={heightText}
          unit={displayUnit}
          invalid={heightMeters === null}
          onChange={(height) => setDraft({ width: widthText, height })}
        />
      </div>
      <button type="button" className="apply-button" data-testid="base-area-apply" disabled={invalid} onClick={apply}>
        Apply
      </button>
      <dl className="base-area-figures">
        <dt>Area</dt>
        <dd data-testid="base-area-area">{formatArea(polygonArea(baseArea.points))}</dd>
        <dt>Perimeter</dt>
        <dd data-testid="base-area-perimeter">{formatLength(polygonPerimeter(baseArea.points), displayUnit)}</dd>
      </dl>
    </aside>
  );
}
