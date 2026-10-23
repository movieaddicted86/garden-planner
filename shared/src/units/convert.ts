import type { LengthUnit } from './length-unit.js';
import { snapToTwelveDigits } from './round.js';

function assertFinite(value: number, caller: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${caller}: value must be finite, got ${value}`);
  }
}

/** A value in `unit` as metres – the internal unit (D1). */
export function toMeters(value: number, unit: LengthUnit): number {
  assertFinite(value, 'toMeters');
  return unit === 'cm' ? value / 100 : value;
}

/**
 * A value in metres as `unit`. The multiplication is snapped to twelve significant digits, so float noise
 * (`1.15 * 100` is `114.99999999999999`) never reaches the caller and the roundtrip `toMeters(fromMeters(x))`
 * is exact (D2).
 */
export function fromMeters(meters: number, unit: LengthUnit): number {
  assertFinite(meters, 'fromMeters');
  return unit === 'cm' ? snapToTwelveDigits(meters * 100) : meters;
}
