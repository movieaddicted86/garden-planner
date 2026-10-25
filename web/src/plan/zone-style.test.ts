import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ZONE_TYPES, createZone } from '@garden-planner/shared';
import { nextZoneName } from './zone-name.js';
import { ZONE_TYPE_COLOR_VARS, ZONE_TYPE_LABELS, zoneColor, zoneTypeLabel } from './zone-style.js';

/** The outline every zone in this file uses; only the type and the id differ between them. */
const POINTS = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
];

test('the label and colour tables cover exactly the zone types of D7', () => {
  // Both tables are `Record<ZoneType, …>`, so the compiler asks for an entry when D7 grows; this pins that no
  // extra key crept in either.
  assert.deepEqual(Object.keys(ZONE_TYPE_LABELS).sort(), [...ZONE_TYPES].sort());
  assert.deepEqual(Object.keys(ZONE_TYPE_COLOR_VARS).sort(), [...ZONE_TYPES].sort());

  for (const type of ZONE_TYPES) {
    assert.ok(ZONE_TYPE_LABELS[type].length > 0, `${type} has an empty label`);
    // a component gets the custom property reference, never a colour: the values live in styles.css
    assert.equal(zoneColor(type), `var(${ZONE_TYPE_COLOR_VARS[type]})`);
  }
});

test('the labels are the words of the task', () => {
  assert.deepEqual(
    ZONE_TYPES.map((type) => zoneTypeLabel(type)),
    ['Path', 'Patio', 'Bed', 'Gravel', 'Lawn', 'Tree pit', 'Parking'],
  );
});

test('AC-1: nextZoneName numbers per type and starts at 1', () => {
  assert.equal(nextZoneName([], 'bed'), 'Bed 1');
  assert.equal(nextZoneName([], 'path'), 'Path 1');
  assert.equal(nextZoneName([], 'tree_pit'), 'Tree pit 1');

  const withOneBed = [createZone({ id: 'a', type: 'bed', points: POINTS })];
  assert.equal(nextZoneName(withOneBed, 'bed'), 'Bed 2');
  // the count is per type: a zone of another type does not advance this one
  assert.equal(nextZoneName(withOneBed, 'path'), 'Path 1');
});

test('AC-1: nextZoneName counts only the zones of that type, wherever they sit in the list', () => {
  const zones = [
    createZone({ id: 'a', type: 'bed', points: POINTS }),
    createZone({ id: 'b', type: 'path', points: POINTS }),
    createZone({ id: 'c', type: 'bed', points: POINTS }),
    createZone({ id: 'd', type: 'lawn', points: POINTS }),
  ];
  assert.equal(nextZoneName(zones, 'bed'), 'Bed 3');
  assert.equal(nextZoneName(zones, 'path'), 'Path 2');
  assert.equal(nextZoneName(zones, 'lawn'), 'Lawn 2');
  assert.equal(nextZoneName(zones, 'gravel'), 'Gravel 1');
});
