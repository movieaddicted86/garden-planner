import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addZone,
  createPolygonBaseArea,
  createProject,
  createRectangleBaseArea,
  createZone,
  SCHEMA_VERSION,
  type Point,
  type ZoneType,
} from '../index.js';

const triangle: readonly Point[] = [
  { x: 1, y: 1 },
  { x: 3, y: 1 },
  { x: 3, y: 2 },
];

test('the model factories are importable from the package entry point (AC-7)', () => {
  for (const factory of [createRectangleBaseArea, createPolygonBaseArea, createZone, createProject, addZone]) {
    assert.ok(typeof factory === 'function');
  }
});

test('createRectangleBaseArea puts the vertices in plan order (AC-2)', () => {
  assert.deepEqual(createRectangleBaseArea(10, 4), {
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 4 },
      { x: 0, y: 4 },
    ],
  });
});

test('createRectangleBaseArea rejects sizes that are not a rectangle (AC-2)', () => {
  for (const [width, height] of [
    [0, 4],
    [10, 0],
    [-1, 4],
    [10, -1],
    [Number.NaN, 4],
    [Number.POSITIVE_INFINITY, 4],
    [10, Number.NEGATIVE_INFINITY],
  ]) {
    assert.throws(
      () => createRectangleBaseArea(width, height),
      (error: unknown) => error instanceof RangeError && error.message.includes('createRectangleBaseArea'),
      `(${width}, ${height}) should throw`,
    );
  }
});

test('createPolygonBaseArea copies the vertices instead of referencing them (AC-3)', () => {
  const input: Point[] = triangle.map((point) => ({ ...point }));
  const baseArea = createPolygonBaseArea(input);

  input[0] = { x: 99, y: 99 };
  input.push({ x: 5, y: 5 });

  assert.deepEqual(baseArea.points, triangle);
  assert.notEqual(baseArea.points, input);
});

test('createPolygonBaseArea rejects fewer than three vertices and non-finite coordinates (AC-3)', () => {
  assert.throws(() => createPolygonBaseArea([]), RangeError);
  assert.throws(
    () =>
      createPolygonBaseArea([
        { x: 0, y: 0 },
        { x: 4, y: 4 },
      ]),
    (error: unknown) => error instanceof RangeError && error.message.includes('at least 3'),
  );
  assert.throws(
    () =>
      createPolygonBaseArea([
        { x: 0, y: 0 },
        { x: Number.NaN, y: 0 },
        { x: 1, y: 1 },
      ]),
    (error: unknown) => error instanceof RangeError && error.message.includes('vertex 1'),
  );
});

test('createPolygonBaseArea accepts a bow tie: validity is validatePolygon s job (AC-3)', () => {
  const bowTie: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 2, y: 2 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
  ];
  assert.deepEqual(createPolygonBaseArea(bowTie), { points: bowTie });
});

test('createZone gives every edge the edging flag and defaults the name to the type (AC-4)', () => {
  const zone = createZone({ id: 'z1', type: 'bed', points: triangle });
  assert.equal(zone.name, 'bed');
  assert.equal(zone.type, 'bed');
  assert.equal(zone.id, 'z1');
  assert.deepEqual(zone.edging, [true, true, true]);
});

test('createZone keeps an explicit name and copies its points (AC-4)', () => {
  const input: Point[] = triangle.map((point) => ({ ...point }));
  const zone = createZone({ id: 'z2', type: 'lawn', name: 'Front lawn', points: input });

  input[0] = { x: -50, y: -50 };

  assert.equal(zone.name, 'Front lawn');
  assert.deepEqual(zone.points, triangle);
  assert.equal(zone.edging.length, zone.points.length);
});

test('createZone rejects an empty id, an unknown type and too few points (AC-4)', () => {
  assert.throws(
    () => createZone({ id: '', type: 'bed', points: triangle }),
    (error: unknown) => error instanceof RangeError && error.message.includes('id'),
  );
  assert.throws(
    () => createZone({ id: 'z3', type: 'shed' as ZoneType, points: triangle }),
    (error: unknown) => error instanceof RangeError && error.message.includes('shed'),
  );
  assert.throws(
    () =>
      createZone({
        id: 'z4',
        type: 'patio',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      }),
    RangeError,
  );
});

test('createProject fills schema version, default unit and an empty zone list (AC-5)', () => {
  const project = createProject({ id: 'p1', name: 'Garden', baseArea: createRectangleBaseArea(10, 4) });
  assert.equal(project.schemaVersion, SCHEMA_VERSION);
  assert.equal(project.displayUnit, 'm');
  assert.deepEqual(project.zones, []);
  assert.deepEqual(project.baseArea.points.length, 4);
});

test('createProject keeps the display unit it is given and copies the base area (AC-5)', () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 3 },
  ];
  const project = createProject({ id: 'p2', name: 'Garden', baseArea: { points }, displayUnit: 'cm' });

  points.push({ x: 99, y: 99 });

  assert.equal(project.displayUnit, 'cm');
  assert.equal(project.baseArea.points.length, 3);
});

test('createProject rejects an empty id or name (AC-5)', () => {
  const baseArea = createRectangleBaseArea(10, 4);
  assert.throws(() => createProject({ id: '', name: 'Garden', baseArea }), RangeError);
  assert.throws(() => createProject({ id: 'p3', name: '', baseArea }), RangeError);
});

test('addZone appends the zone and leaves the original project untouched (AC-6)', () => {
  const project = createProject({ id: 'p1', name: 'Garden', baseArea: createRectangleBaseArea(10, 4) });
  const bed = createZone({ id: 'z1', type: 'bed', points: triangle });
  const path = createZone({ id: 'z2', type: 'path', points: triangle });

  const withBed = addZone(project, bed);
  const withBoth = addZone(withBed, path);

  assert.notEqual(withBed, project);
  assert.deepEqual(project.zones, []);
  assert.deepEqual(withBed.zones, [bed]);
  assert.deepEqual(
    withBoth.zones.map((zone) => zone.id),
    ['z1', 'z2'],
  );
  assert.equal(withBed.zones.length, 1);
  assert.equal(withBoth.displayUnit, project.displayUnit);
  assert.equal(withBoth.schemaVersion, project.schemaVersion);
});

test('addZone rejects a duplicate zone id (AC-6)', () => {
  const project = createProject({ id: 'p1', name: 'Garden', baseArea: createRectangleBaseArea(10, 4) });
  const bed = createZone({ id: 'z1', type: 'bed', points: triangle });
  const withBed = addZone(project, bed);

  assert.throws(
    () => addZone(withBed, createZone({ id: 'z1', type: 'lawn', points: triangle })),
    (error: unknown) => error instanceof RangeError && error.message.includes('z1'),
  );
  assert.equal(withBed.zones.length, 1);
});

test('a stored project comes back through the factories unchanged (D12)', () => {
  const project = addZone(
    createProject({ id: 'p1', name: 'Front garden', baseArea: createRectangleBaseArea(8, 5) }),
    createZone({ id: 'z1', type: 'patio', name: 'Terrace', points: triangle }),
  );

  const restored: typeof project = JSON.parse(JSON.stringify(project)) as typeof project;
  const rebuilt = addZone(
    createProject({ id: restored.id, name: restored.name, baseArea: restored.baseArea, displayUnit: restored.displayUnit }),
    createZone({ ...restored.zones[0], points: restored.zones[0].points }),
  );

  assert.deepEqual(rebuilt, project);
});
