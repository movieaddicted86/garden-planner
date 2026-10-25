import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isZoneType, ZONE_TYPES, type ZoneType } from '../index.js';

test('ZONE_TYPES and isZoneType are importable from the package entry point (AC-7)', () => {
  assert.ok(Array.isArray(ZONE_TYPES));
  assert.ok(typeof isZoneType === 'function');
});

test('ZONE_TYPES holds exactly the seven values of D7, in that order (AC-1)', () => {
  assert.deepEqual(ZONE_TYPES, ['path', 'patio', 'bed', 'gravel', 'lawn', 'tree_pit', 'parking']);
});

test('isZoneType accepts every type of D7 (AC-1)', () => {
  for (const zoneType of ZONE_TYPES) {
    assert.equal(isZoneType(zoneType), true, `${zoneType} should be a zone type`);
  }
});

test('isZoneType rejects near misses and non-strings (AC-1)', () => {
  for (const value of ['Path', '', 'BED', 'tree-pit', 'shed', undefined, null, 42, true, {}, [], ['bed']]) {
    assert.equal(isZoneType(value), false, `${String(value)} should not be a zone type`);
  }
});

test('the narrowed value can be used as a ZoneType without a cast', () => {
  const value: unknown = 'gravel';
  assert.equal(isZoneType(value), true);
  if (!isZoneType(value)) {
    throw new Error('unreachable: the guard narrowed the value to false');
  }
  // Compiles only if `value` is narrowed to ZoneType (AC-1).
  const zoneType: ZoneType = value;
  assert.equal(zoneType, 'gravel');
});
