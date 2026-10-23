import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromMeters, type LengthUnit, toMeters } from '../index.js';

const UNITS: readonly LengthUnit[] = ['m', 'cm'];

test('toMeters converts centimetres and leaves metres alone (D1)', () => {
  assert.equal(toMeters(150, 'cm'), 1.5);
  assert.equal(toMeters(-30.5, 'cm'), -0.305);
  assert.equal(toMeters(0, 'cm'), 0);
  assert.equal(toMeters(2.5, 'm'), 2.5);
  assert.equal(toMeters(-2.5, 'm'), -2.5);
});

test('fromMeters multiplies centimetres and leaves metres alone (D1)', () => {
  assert.equal(fromMeters(1.5, 'cm'), 150);
  assert.equal(fromMeters(-0.305, 'cm'), -30.5);
  assert.equal(fromMeters(2.5, 'm'), 2.5);
});

test('fromMeters removes the float noise of the multiplication', () => {
  // Without the twelve-digit snap this is 114.99999999999999.
  assert.equal(fromMeters(1.15, 'cm'), 115);
  assert.equal(fromMeters(8.7, 'cm'), 870);
  assert.equal(fromMeters(0.29, 'cm'), 29);
  assert.equal(fromMeters(0.07, 'cm'), 7);
});

test('a rounded metre value keeps an exact centimetre value', () => {
  // 2.34 m is 234 cm, but 2.34 * 100 is 234.00000000000003 in plain float arithmetic.
  assert.equal(fromMeters(2.34, 'cm'), 234);
  assert.equal(toMeters(234, 'cm'), 2.34);
});

test('AC-1 roundtrip cm -> m -> cm is exact for every integer centimetre (AC-1)', () => {
  for (let n = -100000; n <= 100000; n += 1) {
    const roundtripped = fromMeters(toMeters(n, 'cm'), 'cm');
    if (roundtripped !== n) {
      assert.fail(`n = ${n}: roundtrip gave ${roundtripped}`);
    }
  }
});

test('AC-2 the unit toggle never changes a stored value (AC-2)', () => {
  for (let k = -100000; k <= 100000; k += 1) {
    const metres = k / 100;
    const back = toMeters(fromMeters(metres, 'cm'), 'cm');
    if (back !== metres) {
      assert.fail(`k = ${k}: ${metres} m came back as ${back} m`);
    }
  }
});

test('a roundtrip through the unit toggle is exact for every value a cm display can hold', () => {
  for (const metres of [0, 1, -1, 0.01, 1.15, 12.35, 0.07, -1234.56, 1e9]) {
    for (const unit of UNITS) {
      assert.equal(toMeters(fromMeters(metres, unit), unit), metres);
    }
  }
});

test('below one centimetre the roundtrip keeps twelve significant digits', () => {
  // The snap is defined over significant digits, so a value smaller than the cm display can show (D2) keeps
  // its twelve digits instead of coming back bit for bit: 1e-9 m is 9.999999999999999e-10 m after a toggle.
  const tiny = 1e-9;
  const back = toMeters(fromMeters(tiny, 'cm'), 'cm');
  assert.ok(Math.abs(back - tiny) < 1e-21, `expected ~${tiny}, got ${back}`);
  assert.equal(back.toPrecision(12), tiny.toPrecision(12));
});

test('a non-finite value throws a RangeError naming the function', () => {
  for (const broken of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(
      () => toMeters(broken, 'cm'),
      (error: unknown) => error instanceof RangeError && error.message.includes('toMeters'),
    );
    assert.throws(
      () => fromMeters(broken, 'cm'),
      (error: unknown) => error instanceof RangeError && error.message.includes('fromMeters'),
    );
  }
});
