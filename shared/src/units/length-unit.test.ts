import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DISPLAY_DECIMALS } from '../index.js';

test('the display decimals are exported from the package entry point', () => {
  assert.deepEqual(DISPLAY_DECIMALS, { m: 2, cm: 0 });
});

test('DISPLAY_DECIMALS is the single source of the decimals (D2)', () => {
  assert.equal(DISPLAY_DECIMALS.m, 2);
  assert.equal(DISPLAY_DECIMALS.cm, 0);
  assert.equal(Object.keys(DISPLAY_DECIMALS).length, 2);
});
