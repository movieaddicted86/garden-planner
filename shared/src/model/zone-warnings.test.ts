import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addZone,
  createPolygonBaseArea,
  createProject,
  createZone,
  findZoneWarnings,
  type Point,
  type Project,
  type Zone,
  type ZoneWarning,
} from '../index.js';

/** `sq(x0, y0, x1, y1)`: the axis-aligned rectangle with those corners, as a vertex list. */
function sq(x0: number, y0: number, x1: number, y1: number): readonly Point[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

/** A zone with `points`, all edges taking part in the edging (created through the factory, so D3 holds). */
function zone(id: string, points: readonly Point[]): Zone {
  return createZone({ id, type: 'bed', points });
}

/** A project with the 10x10 base area of AC-6 and the given zones, in the given order. */
function projectWith(zones: readonly Zone[], baseArea: readonly Point[] = sq(0, 0, 10, 10)): Project {
  return zones.reduce(addZone, createProject({ id: 'p1', name: 'Front garden', baseArea: createPolygonBaseArea(baseArea) }));
}

test('AC-6: outside-base first, then overlaps by zone index, each pair once', () => {
  const project = projectWith([
    zone('a', sq(1, 1, 4, 4)),
    zone('b', sq(3, 3, 6, 6)),
    zone('c', sq(8, 8, 12, 9)),
    zone('d', sq(7, 1, 9, 3)),
  ]);

  const expected: ZoneWarning[] = [
    { kind: 'outside_base', zone: 'c' },
    { kind: 'overlap', zoneA: 'a', zoneB: 'b' },
  ];
  assert.deepEqual(findZoneWarnings(project), expected);
});

test('AC-6: a project without zones has no warnings', () => {
  assert.deepEqual(findZoneWarnings(projectWith([])), []);
});

test('AC-6: a project with one zone inside the base area has no warnings', () => {
  assert.deepEqual(findZoneWarnings(projectWith([zone('a', sq(1, 1, 4, 4))])), []);
});

test('AC-6: a bow-tie zone does not make the warning list throw', () => {
  const bowTie: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 2, y: 2 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
  ];

  let warnings: ZoneWarning[] | undefined;
  assert.doesNotThrow(() => {
    warnings = findZoneWarnings(projectWith([zone('bow', bowTie), zone('a', sq(1, 1, 4, 4))]));
  });
  // Only "no throw" is contracted for an invalid zone (best effort); the list is still a list of warnings.
  assert.ok(Array.isArray(warnings));
  for (const warning of warnings ?? []) {
    assert.ok(warning.kind === 'overlap' || warning.kind === 'outside_base');
  }
});

test('several outside-base zones come in zone order, not in the order they were found', () => {
  const project = projectWith([
    zone('first', sq(1, 1, 2, 2)), // inside
    zone('second', sq(9, 9, 11, 11)), // leaves the base area at the far corner
    zone('third', sq(-1, 5, -0.5, 6)), // leaves it on the other side, far from every other zone
  ]);
  assert.deepEqual(findZoneWarnings(project), [
    { kind: 'outside_base', zone: 'second' },
    { kind: 'outside_base', zone: 'third' },
  ]);
});

test('overlaps are ordered by (indexA, indexB) and the ids follow the project order', () => {
  // `b` overlaps both `a` and `c`; `a` and `c` do not overlap. The pair (a, b) has to come before (b, c), and the
  // ids are reported as they appear in the project, not sorted alphabetically.
  const project = projectWith([zone('z-late', sq(0, 0, 4, 4)), zone('a-mid', sq(2, 0, 6, 4)), zone('m-early', sq(4, 0, 8, 4))]);
  assert.deepEqual(findZoneWarnings(project), [
    { kind: 'overlap', zoneA: 'z-late', zoneB: 'a-mid' },
    { kind: 'overlap', zoneA: 'a-mid', zoneB: 'm-early' },
  ]);
});

test('a zone sharing the border of the base area has not left it (D6)', () => {
  // D6 is about a zone *leaving* the base area; a zone drawn exactly on the border is a normal plan.
  const project = projectWith([zone('edge', sq(0, 0, 4, 4)), zone('strip', sq(0, 4, 10, 6))]);
  assert.deepEqual(findZoneWarnings(project), []);
});

test('a zone fully inside the notch of the base area is still inside it', () => {
  // The base area is an L-shape; the zone sits in the notch of the *zone list*, not in the base area.
  const lShapedBase = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 10 },
    { x: 0, y: 10 },
  ];
  assert.deepEqual(findZoneWarnings(projectWith([zone('arm', sq(1, 1, 3, 9))], lShapedBase)), []);
  // A zone that reaches into the notch of the base area leaves it.
  assert.deepEqual(findZoneWarnings(projectWith([zone('poke', sq(3, 3, 6, 6))], lShapedBase)), [{ kind: 'outside_base', zone: 'poke' }]);
});

test('two zones that only touch are not reported as overlapping (D6)', () => {
  // Neighbouring beds share a border by design: the warning is for real overlaps, which double the material.
  const project = projectWith([zone('left', sq(1, 1, 3, 3)), zone('right', sq(3, 1, 5, 3))]);
  assert.deepEqual(findZoneWarnings(project), []);
  // A real overlap between the same two shapes is reported.
  assert.deepEqual(findZoneWarnings(projectWith([zone('left', sq(1, 1, 3, 3)), zone('right', sq(2.5, 1, 5, 3))])), [
    { kind: 'overlap', zoneA: 'left', zoneB: 'right' },
  ]);
});

test('a duplicated zone is reported once, as one overlapping pair', () => {
  const project = projectWith([zone('copy1', sq(1, 1, 3, 3)), zone('copy2', sq(1, 1, 3, 3))]);
  assert.deepEqual(findZoneWarnings(project), [{ kind: 'overlap', zoneA: 'copy1', zoneB: 'copy2' }]);
});

test('three zones overlapping in one point produce three pairs, not one', () => {
  const project = projectWith([zone('left', sq(1, 1, 4, 4)), zone('middle', sq(2, 1, 5, 4)), zone('right', sq(3, 1, 6, 4))]);
  assert.deepEqual(findZoneWarnings(project), [
    { kind: 'overlap', zoneA: 'left', zoneB: 'middle' },
    { kind: 'overlap', zoneA: 'left', zoneB: 'right' },
    { kind: 'overlap', zoneA: 'middle', zoneB: 'right' },
  ]);
});

test('the project is only read: the same project gives the same list twice (D11 purity)', () => {
  const project = projectWith([zone('a', sq(1, 1, 4, 4)), zone('b', sq(3, 3, 6, 6)), zone('c', sq(8, 8, 12, 9))]);
  const before = JSON.parse(JSON.stringify(project)) as Project;
  const first = findZoneWarnings(project);
  const second = findZoneWarnings(project);
  assert.deepEqual(first, second);
  assert.deepEqual(project, before);
});

test('AC-7: the warnings API is importable from the package entry point', () => {
  // This test imports from `../index.js` as the entry point of `@garden-planner/shared` (the package's `exports`
  // map resolves the bare specifier to exactly this file); `server/src/app.ts` already imports the package by
  // name, so the module resolution itself is covered by the workspace typecheck.
  assert.equal(typeof findZoneWarnings, 'function');
});
