import { toMeters } from './convert.js';
import type { LengthUnit } from './length-unit.js';

/**
 * One optional sign, digits with at most one decimal separator (dot or comma), nothing else. `Number()` would
 * also read hex literals and `"1e3"`, which a garden planner must not accept as user input.
 */
const DECIMAL_LENGTH = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;

/**
 * Reads a length typed by the user (German keyboards produce a decimal comma) and returns it **in metres**, or
 * `null` if the text is not a number. Leading and trailing whitespace is ignored; a unit suffix is **not**
 * accepted – the unit comes from the caller, never from the text. Rounding is not applied here (D2).
 */
export function parseLength(text: string, unit: LengthUnit): number | null {
  const trimmed = text.trim();
  if (!DECIMAL_LENGTH.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(value)) {
    return null;
  }

  return toMeters(value, unit);
}
