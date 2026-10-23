import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DISPLAY_DECIMALS, formatArea, formatLength, fromMeters, parseLength, toMeters } from '../index.js';

test('the whole units area is importable from the package entry point (AC-8)', () => {
  assert.deepEqual(DISPLAY_DECIMALS, { m: 2, cm: 0 });
  for (const helper of [toMeters, fromMeters, formatLength, formatArea, parseLength]) {
    assert.equal(typeof helper, 'function');
  }
});

test('parseLength reads both decimal separators (AC-5)', () => {
  assert.equal(parseLength('1,5', 'm'), 1.5);
  assert.equal(parseLength('1.5', 'm'), 1.5);
  assert.equal(parseLength('.5', 'm'), 0.5);
  assert.equal(parseLength(',5', 'm'), 0.5);
  assert.equal(parseLength('5.', 'm'), 5);
  assert.equal(parseLength('5,', 'm'), 5);
});

test('parseLength ignores surrounding whitespace (AC-5)', () => {
  assert.equal(parseLength(' 150 ', 'cm'), 1.5);
  assert.equal(parseLength('\t2,5\n', 'm'), 2.5);
});

test('parseLength interprets the number in the given unit and returns metres (D1, AC-5)', () => {
  assert.equal(parseLength('-30,5', 'cm'), -0.305);
  assert.equal(parseLength('150', 'cm'), 1.5);
  assert.equal(parseLength('150', 'm'), 150);
  assert.equal(parseLength('+2.5', 'm'), 2.5);
  assert.equal(parseLength('-2.5', 'm'), -2.5);
  assert.equal(parseLength('0', 'm'), 0);
  assert.equal(parseLength('0', 'cm'), 0);
});

test('parseLength returns null for anything that is not a plain number (AC-5)', () => {
  const rejected: readonly string[] = [
    '',
    ' ',
    'abc',
    '1.2.3',
    '1,2,3',
    '1e3',
    '1 000',
    '--1',
    ',',
    '+',
    '1m',
    '-',
    '.',
    '1..2',
    '1,,2',
    '0x10',
    'Infinity',
    'NaN',
    '1.2e3',
    '1,000.5',
    '½',
  ];
  for (const text of rejected) {
    assert.equal(parseLength(text, 'm'), null, `"${text}" must be rejected`);
    assert.equal(parseLength(text, 'cm'), null, `"${text}" must be rejected in cm too`);
  }
});

test('parseLength does not round (D2: rounding happens only when formatting)', () => {
  assert.equal(parseLength('1.005', 'm'), 1.005);
  assert.equal(parseLength('0.004', 'cm'), 0.00004);
});

test('parseLength never returns a non-finite number', () => {
  const huge = `${'9'.repeat(320)}`;
  assert.equal(parseLength(huge, 'm'), null);
});

test('a giant but finite input stays finite in centimetres too', () => {
  const parsed = parseLength('1'.repeat(300), 'cm');
  assert.ok(parsed !== null && Number.isFinite(parsed));
});
