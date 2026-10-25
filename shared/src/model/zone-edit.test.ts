import assert from 'node:assert/strict';
import { test } from 'node:test';
import { insertVertex, moveVertex, removeVertex, toggleEdge, type Point, type Zone } from '../index.js';

/**
 * The square of the acceptance criteria (D1 plan orientation: x right, y downwards), with an edging pattern that
 * is not all-true and not symmetric, so a flag that lands on the wrong edge is visible in every case.
 */
const square: Zone = {
  id: 'z1',
  name: 'patio',
  type: 'patio',
  points: [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
  ],
  edging: [true, false, true, false],
};

/** The square with a vertex inserted on edge 0 (AC-2, first case): 5 points, `(2,0)` at index 1. */
const squareWithVertexOnEdge0: Zone = {
  ...square,
  points: [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
  ],
  edging: [true, true, false, true, false],
};

const triangle: Zone = {
  id: 'z2',
  name: 'bed',
  type: 'bed',
  points: [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 0, y: 3 },
  ],
  edging: [true, true, true],
};

/** A deep copy of a zone, for "the argument is untouched" assertions. */
function snapshot(zone: Zone): Zone {
  return {
    id: zone.id,
    name: zone.name,
    type: zone.type,
    points: zone.points.map((p) => ({ ...p })),
    edging: [...zone.edging],
  };
}

/** Both sides of the invariant every operation has to keep (D10, AC-8). */
function assertConsistent(zone: Zone, label: string): void {
  assert.equal(zone.edging.length, zone.points.length, `${label}: edging and points must be the same length`);
  assert.ok(zone.points.length >= 3, `${label}: a zone keeps at least 3 vertices (D3)`);
}

/** `[index, ...indexes]` of the bad values of AC-7, reused by all four operations. */
const badIndexes = [-1, 4, 1.5, Number.NaN, Number.POSITIVE_INFINITY];

test('the zone-edit operations are importable from the package entry point (AC-10)', () => {
  for (const operation of [moveVertex, insertVertex, removeVertex, toggleEdge]) {
    assert.ok(typeof operation === 'function');
  }
});

test('moveVertex replaces one vertex and leaves the edging and the argument alone (AC-1)', () => {
  const before = snapshot(square);
  const target: Point = { x: 5, y: 5 }; // a readonly Point, the type the declared signature takes
  const moved = moveVertex(square, 2, target);

  assert.deepEqual(moved.points, [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 5, y: 5 },
    { x: 0, y: 4 },
  ]);
  assert.deepEqual(moved.edging, [true, false, true, false]);
  assert.deepEqual(square, before, 'the argument zone must be untouched');
  assert.notEqual(moved, square, 'a new zone, not the same object');
  assert.notEqual(moved.points, square.points);
  assert.notEqual(moved.edging, square.edging);
  // Everything but the geometry is carried over unchanged.
  assert.equal(moved.id, square.id);
  assert.equal(moved.name, square.name);
  assert.equal(moved.type, square.type);
});

test('moveVertex copies the target point, so a later mutation of the caller’s object cannot reach in', () => {
  const target = { x: 5, y: 5 };
  const moved = moveVertex(square, 2, target);

  target.x = 99;
  assert.deepEqual(moved.points[2], { x: 5, y: 5 });
});

test('insertVertex splits an edge, both halves inheriting its flag (AC-2)', () => {
  // Middle of edge 0 (0,0)-(4,0): the default position.
  const onEdge0 = insertVertex(square, 0);
  assert.deepEqual(onEdge0, squareWithVertexOnEdge0);
  assertConsistent(onEdge0, 'insertVertex(square, 0)');

  // An explicit position on edge 1 (4,0)-(4,4), whose flag is false.
  const onEdge1 = insertVertex(square, 1, { x: 4, y: 1 });
  assert.deepEqual(onEdge1.points, [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 1 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
  ]);
  assert.deepEqual(onEdge1.edging, [true, false, false, true, false]);

  // The closing edge 3 (0,4)-(0,0): the new vertex is appended at the end, index 4.
  const onClosing = insertVertex(square, 3);
  assert.deepEqual(onClosing.points, [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
    { x: 0, y: 2 },
  ]);
  assert.deepEqual(onClosing.edging, [true, false, true, false, false]);
});

test('insertVertex defaults to the midpoint of the edge, also for the closing edge (AC-2)', () => {
  assert.deepEqual(insertVertex(square, 2).points[3], { x: 2, y: 4 }); // edge 2: (4,4)-(0,4)
  assert.deepEqual(insertVertex(square, 3).points[4], { x: 0, y: 2 }); // edge 3: (0,4)-(0,0)
});

test('insertVertex leaves the argument untouched and copies the given point', () => {
  const before = snapshot(square);
  const at = { x: 4, y: 1 };
  const inserted = insertVertex(square, 1, at);

  at.y = 2;
  assert.deepEqual(inserted.points[2], { x: 4, y: 1 });
  assert.deepEqual(square, before);
  assert.notEqual(inserted.points, square.points);
  assert.notEqual(inserted.edging, square.edging);
});

test('removing the vertex an insert added is the identity (AC-3)', () => {
  const restored = removeVertex(squareWithVertexOnEdge0, 1);
  assert.deepEqual(restored.points, square.points);
  assert.deepEqual(restored.edging, square.edging);
});

test('removeVertex merges two edges and keeps the first flag in cyclic order (AC-4)', () => {
  const withoutFirst = removeVertex(square, 0);
  assert.deepEqual(withoutFirst.points, [
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
  ]);
  assert.deepEqual(withoutFirst.edging, [false, true, false]);

  const withoutLast = removeVertex(square, 3);
  assert.deepEqual(withoutLast.points, [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
  ]);
  assert.deepEqual(withoutLast.edging, [true, false, true]);
});

test('removeVertex keeps the earlier flag for every index of a longer zone (AC-4, D10)', () => {
  // A 5-gon with a distinct flag per edge, so the merged edge's slot is readable in the result.
  const zone: Zone = {
    ...square,
    points: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ],
    edging: [true, true, false, false, true],
  };

  // Vertex i joins edge i-1 (first, keeps its flag) and edge i: the result has the flag of edge i-1 at slot i-1.
  assert.deepEqual(removeVertex(zone, 0).edging, [true, false, false, true]); // closing edge 4 + edge 0 → slot 3
  assert.deepEqual(removeVertex(zone, 1).edging, [true, false, false, true]); // edge 0 + edge 1 → slot 0
  assert.deepEqual(removeVertex(zone, 2).edging, [true, true, false, true]); // edge 1 + edge 2 → slot 1
  assert.deepEqual(removeVertex(zone, 3).edging, [true, true, false, true]); // edge 2 + edge 3 → slot 2
  assert.deepEqual(removeVertex(zone, 4).edging, [true, true, false, false]); // edge 3 + edge 4 → slot 3
});

test('removeVertex refuses to take a zone below three vertices (AC-5)', () => {
  for (const index of [0, 1, 2]) {
    assert.throws(
      () => removeVertex(triangle, index),
      (error: unknown) => error instanceof RangeError && error.message.includes('removeVertex'),
      `removeVertex(triangle, ${index}) should throw`,
    );
  }
});

test('four vertices are already enough to lose one (AC-5 boundary)', () => {
  const quad: Zone = { ...triangle, points: [...triangle.points, { x: 4, y: 3 }], edging: [true, true, true, false] };
  assert.deepEqual(removeVertex(quad, 3).points, triangle.points);
  assert.deepEqual(removeVertex(quad, 3).edging, [true, true, true]);
  assert.throws(() => removeVertex(removeVertex(quad, 3), 0), RangeError, 'back at three vertices');
});

test('removeVertex leaves the argument untouched', () => {
  const before = snapshot(square);
  removeVertex(square, 2);
  assert.deepEqual(square, before);
});

test('toggleEdge inverts one flag and twice restores the original (AC-6)', () => {
  const toggled = toggleEdge(square, 1);
  assert.deepEqual(toggled.edging, [true, true, true, false]);
  assert.deepEqual(toggled.points, square.points);
  assert.deepEqual(toggleEdge(toggled, 1).edging, square.edging);

  // Every edge is addressable, including the closing one.
  assert.deepEqual(toggleEdge(square, 0).edging, [false, false, true, false]);
  assert.deepEqual(toggleEdge(square, 3).edging, [true, false, true, true]);
});

test('every operation rejects an index that is not an integer in range (AC-7)', () => {
  for (const index of badIndexes) {
    assert.throws(() => moveVertex(square, index, { x: 1, y: 1 }), RangeError, `moveVertex ${index}`);
    assert.throws(() => insertVertex(square, index), RangeError, `insertVertex ${index}`);
    assert.throws(() => removeVertex(square, index), RangeError, `removeVertex ${index}`);
    assert.throws(() => toggleEdge(square, index), RangeError, `toggleEdge ${index}`);
  }
  // The last valid index still works, so the range is `0..n-1` and not off by one.
  assert.equal(moveVertex(square, 3, { x: 1, y: 1 }).points.length, 4);
  assert.equal(insertVertex(square, 3).points.length, 5);
  assert.equal(removeVertex(square, 3).points.length, 3);
  assert.equal(toggleEdge(square, 3).edging.length, 4);
});

test('a non-finite point is rejected (AC-7)', () => {
  for (const [x, y] of [
    [Number.NaN, 1],
    [1, Number.NaN],
    [Number.POSITIVE_INFINITY, 1],
    [1, Number.NEGATIVE_INFINITY],
  ]) {
    assert.throws(() => moveVertex(square, 1, { x, y }), RangeError, `moveVertex to (${x}, ${y})`);
    assert.throws(() => insertVertex(square, 1, { x, y }), RangeError, `insertVertex at (${x}, ${y})`);
  }
  // The other two operations take no point, so a zone with a broken vertex is their argument, not their input.
  assert.doesNotThrow(() => removeVertex(square, 1));
  assert.doesNotThrow(() => toggleEdge(square, 1));
});

test('200 pseudo-random operations keep points and edging in step (AC-8)', () => {
  // A fixed-seed LCG (Numerical Recipes constants) over 2^32, so the sequence is the same on every machine and
  // on every run — `Math.random` would make a failure unreproducible. `1664525 * state` stays below 2^53, so the
  // product is exact in a double and the recurrence has no precision loss.
  //
  // The draw takes the **high** bits: the low bits of an LCG are notoriously weak (bit k has period 2^(k+1)), and
  // `state % 4` therefore collapses to a cycle so short that one operation kind was drawn every single step.
  let state = 12345;
  const next = (bound: number): number => {
    state = (1664525 * state + 1013904223) % 4294967296;
    return Math.floor(state / 65536) % bound;
  };

  let zone = square;
  const applied = { move: 0, insert: 0, remove: 0, toggle: 0 };

  for (let step = 0; step < 200; step += 1) {
    let operation = next(4);
    // A 3-vertex zone cannot lose a vertex (AC-5), so the draw is redirected rather than the step skipped —
    // the loop still performs 200 operations.
    if (operation === 2 && zone.points.length <= 3) {
      operation = 1;
    }

    if (operation === 0) {
      applied.move += 1;
      zone = moveVertex(zone, next(zone.points.length), { x: next(1000) / 10, y: next(1000) / 10 });
    } else if (operation === 1) {
      applied.insert += 1;
      zone = insertVertex(zone, next(zone.points.length), { x: next(1000) / 10, y: next(1000) / 10 });
    } else if (operation === 2) {
      applied.remove += 1;
      zone = removeVertex(zone, next(zone.points.length));
    } else {
      applied.toggle += 1;
      zone = toggleEdge(zone, next(zone.edging.length));
    }

    assertConsistent(zone, `step ${step}`);
  }

  // The loop has to have exercised all four operations, or the invariant above proves little.
  for (const [name, count] of Object.entries(applied)) {
    assert.ok(count > 0, `${name} was never applied`);
  }
  // And it has to have moved the shape away from the square, so the invariant is not trivially true on one zone.
  assert.notDeepEqual(zone.points, square.points);
});
