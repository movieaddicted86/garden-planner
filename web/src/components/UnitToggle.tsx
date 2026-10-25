import type { LengthUnit } from '@garden-planner/shared';

/** The options of the toggle, in the order they are shown. */
const UNIT_OPTIONS: readonly LengthUnit[] = ['m', 'cm'];

/** The props of the toggle: the unit in effect and what to do when the user picks another one. */
export interface UnitToggleProps {
  readonly unit: LengthUnit;
  readonly onChange: (unit: LengthUnit) => void;
}

/**
 * The m/cm switch of the display and input unit (D1, D2). A radio group rather than one button: both options stay
 * visible, so the current one is readable without clicking, and the arrow keys move between them the way a
 * keyboard user expects. The unit itself is not local state — the store holds it and re-reads every value in it.
 */
export function UnitToggle({ unit, onChange }: UnitToggleProps) {
  return (
    <div className="unit-toggle" role="radiogroup" aria-label="Unit">
      {UNIT_OPTIONS.map((option) => (
        <label key={option} className="unit-option">
          <input type="radio" name="display-unit" value={option} checked={unit === option} onChange={() => onChange(option)} />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}
