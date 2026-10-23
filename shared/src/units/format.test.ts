import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatArea, formatLength, parseLength, type LengthUnit } from '../index.js';

test('formatLength uses the decimals of the unit (AC-3)', () => {
  assert.equal(formatLength(1.005, 'm'), '1.01 m');
  assert.equal(formatLength(0.125, 'm'), '0.13 m');
  assert.equal(formatLength(-0.125, 'm'), '-0.13 m');
  assert.equal(formatLength(-0.001, 'm'), '0.00 m');
  assert.equal(formatLength(2, 'm'), '2.00 m');
  assert.equal(formatLength(1.005, 'cm'), '101 cm');
  assert.equal(formatLength(0.004, 'cm'), '0 cm');
  assert.equal(formatLength(-0.004, 'cm'), '0 cm');
  assert.equal(formatLength(1.234, 'cm'), '123 cm');
});

test('formatLength never shows a negative zero (D2)', () => {
  assert.equal(formatLength(-0, 'm'), '0.00 m');
  assert.equal(formatLength(-0, 'cm'), '0 cm');
  assert.equal(formatLength(-1e-9, 'cm'), '0 cm');
});

test('formatLength writes a dot, never a comma, and always the unit (D2)', () => {
  assert.equal(formatLength(1234.5, 'm'), '1234.50 m');
  assert.equal(formatLength(1234.5, 'cm'), '123450 cm');
  assert.equal(formatLength(1.5, 'cm'), '150 cm');
});

test('formatArea always shows m² with two decimals (AC-4)', () => {
  assert.equal(formatArea(12.345), '12.35 m²');
  assert.equal(formatArea(0.004), '0.00 m²');
  assert.equal(formatArea(0), '0.00 m²');
  assert.equal(formatArea(-0.004), '0.00 m²');
  assert.equal(formatArea(-0), '0.00 m²');
  assert.equal(formatArea(0.125), '0.13 m²');
  assert.equal(formatArea(1234.5678), '1234.57 m²');
});

test('formatArea uses the same rounding helper as formatLength (AC-4)', () => {
  assert.equal(formatArea(1.005), '1.01 m²');
  assert.equal(formatArea(-1.005), '-1.01 m²');
});

test('formatLength and formatArea throw a RangeError for a non-finite value (AC-6)', () => {
  for (const broken of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(
      () => formatLength(broken, 'm'),
      (error: unknown) => error instanceof RangeError && error.message.includes('formatLength'),
    );
    assert.throws(
      () => formatArea(broken),
      (error: unknown) => error instanceof RangeError && error.message.includes('formatArea'),
    );
  }
});

// Values with float noise on purpose: 7 * 0.05, 3.15, 1.15, 0.29 * 100 …
const CONSISTENCY_TABLE: readonly number[] = [
  0, 1.5, -1.5, 0.05, -0.05, 0.35, 3.15, 1.15, 2.34, -2.34, 12.345, -12.345, 0.07, 1234.56, -0.004, 100000,
];

/** The number part of `"123 cm"` / `"1.25 m"`, without the unit the user does not type. */
function numberPartOf(shown: string): string {
  return shown.slice(0, shown.indexOf(' '));
}

test('AC-7 parsing the display text gives back the value within half a centimetre (AC-7)', () => {
  const unit: LengthUnit = 'cm';
  for (const metres of CONSISTENCY_TABLE) {
    const shown = formatLength(metres, unit);
    const parsed = parseLength(numberPartOf(shown), unit);
    assert.notEqual(parsed, null, `${shown} must be parseable`);
    assert.ok(Math.abs(parsed! - metres) <= 0.005, `${shown} -> ${parsed} m differs from ${metres} m`);
  }
});

test('AC-7 the same holds for metres, within half a centimetre', () => {
  for (const metres of CONSISTENCY_TABLE) {
    const shown = formatLength(metres, 'm');
    const parsed = parseLength(numberPartOf(shown), 'm');
    assert.notEqual(parsed, null, `${shown} must be parseable`);
    assert.ok(Math.abs(parsed! - metres) <= 0.005, `${shown} -> ${parsed} m differs from ${metres} m`);
  }
});
