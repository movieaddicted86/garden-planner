import { fromMeters } from './convert.js';
import { DISPLAY_DECIMALS, type LengthUnit } from './length-unit.js';
import { roundHalfAwayFromZero } from './round.js';

/** All formatters of this area reject a value that is not a finite number, instead of printing `NaN`. */
function assertFinite(value: number, caller: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${caller}: value must be finite, got ${value}`);
  }
}

/**
 * Fixed notation of the **number** of a length in `unit`, without the unit: the stored metres are converted into
 * `unit` first (`1.005 m` in `cm` is `101`), then rounded to that unit's decimals. A dot as decimal separator, no
 * thousands separator, never `-0.00` or `-0`. Independent of the machine's locale.
 *
 * An input field needs exactly this: `parseLength` of the text it shows has to give the stored value back, and a
 * unit suffix in the field would be rejected by `parseLength`. `formatLength` adds the unit for display.
 */
export function formatLengthValue(meters: number, unit: LengthUnit): string {
  assertFinite(meters, 'formatLengthValue');
  const decimals = DISPLAY_DECIMALS[unit];
  const rounded = roundHalfAwayFromZero(fromMeters(meters, unit), decimals);
  return rounded.toFixed(decimals);
}

/**
 * Fixed notation of a single length for display (D2): the number of `formatLengthValue` followed by a space and
 * the unit. Never `-0.00 m` or `-0 cm`.
 */
export function formatLength(meters: number, unit: LengthUnit): string {
  return `${formatLengthValue(meters, unit)} ${unit}`;
}

/**
 * Fixed notation of an area for display: always m², whatever the length unit is set to (D2). Two decimals,
 * the superscript two is U+00B2.
 */
export function formatArea(squareMetres: number): string {
  assertFinite(squareMetres, 'formatArea');
  const rounded = roundHalfAwayFromZero(squareMetres, 2);
  return `${rounded.toFixed(2)} m²`;
}
