import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pointInPolygon, type Point } from '../index.js';

/** `sq(x0, y0, x1, y1)`: the axis-aligned rectangle with those corners (AC-1), counter-clockwise as drawn. */
function sq(x0: number, y0: number, x1: number, y1: number): readonly Point[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

/**
 * The concave L-shape of AC-1: the horizontal arm is `x 0..4, y 0..1`, the vertical one `x 0..1, y 0..3`, and
 * the notch that makes it concave is `x 1..4, y 1..3`.
 */
const lShape: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 3 },
  { x: 0, y: 3 },
];

const square = sq(0, 0, 4, 4);

test('a point in the middle of the square is inside (AC-1)', () => {
  assert.equal(pointInPolygon({ x: 2, y: 2 }, square), 'inside');
});

test('a point beyond the square is outside (AC-1)', () => {
  assert.equal(pointInPolygon({ x: 5, y: 2 }, square), 'outside');
});

test('a point on an edge is boundary, a corner too (AC-1)', () => {
  // The flat of the right edge and the bottom-left corner: the corner is an edge endpoint, so the distance test
  // has to reach it as well.
  assert.equal(pointInPolygon({ x: 4, y: 2 }, square), 'boundary');
  assert.equal(pointInPolygon({ x: 0, y: 0 }, square), 'boundary');
  assert.equal(pointInPolygon({ x: 2, y: 4 }, square), 'boundary');
});

test('a hair outside the right edge is still boundary, a micrometre outside is not (AC-1)', () => {
  // The tolerance is 1e-9 m: 1e-12 m is far below it (boundary), 1e-6 m far above it (outside), and the
  // transition is exactly the difference between "touching" and "next to" in D6.
  assert.equal(pointInPolygon({ x: 4 + 1e-12, y: 2 }, square), 'boundary');
  assert.equal(pointInPolygon({ x: 4 + 1e-6, y: 2 }, square), 'outside');
});

test('the L-shape reports the notch as outside and both arms as inside (AC-1)', () => {
  assert.equal(pointInPolygon({ x: 2, y: 2 }, lShape), 'outside');
  assert.equal(pointInPolygon({ x: 0.5, y: 2 }, lShape), 'inside');
  assert.equal(pointInPolygon({ x: 2, y: 0.5 }, lShape), 'inside');
});

test('the L-shape answers its own outline as boundary (AC-1, D6)', () => {
  // All six vertices, plus a point on the flat of the inner corner edge `(1,1)-(1,3)`.
  for (const vertex of lShape) {
    assert.equal(pointInPolygon(vertex, lShape), 'boundary');
  }
  assert.equal(pointInPolygon({ x: 1, y: 2 }, lShape), 'boundary');
});

test('a ray running along an edge and through its vertices counts them once (AC-1)', () => {
  // A 4x4 square with the top-right block `x 1..4, y 2..4` cut out. The probe (0.5, 2) is inside the left arm —
  // half a metre from every edge, so not a boundary case — but its ray to the right runs exactly along the edge
  // `(4,2)-(1,2)` and passes through both of that edge's vertices. The edge itself contributes nothing (its
  // endpoints compare the same way) and vertex (1,2) of the edge `(1,2)-(1,4)` is counted once, so the answer is
  // inside. Counting the vertex twice, or counting the horizontal edge, flips it to outside.
  const notched: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 2 },
    { x: 1, y: 2 },
    { x: 1, y: 4 },
    { x: 0, y: 4 },
  ];
  assert.equal(pointInPolygon({ x: 0.5, y: 2 }, notched), 'inside');
  assert.equal(pointInPolygon({ x: 2, y: 2 }, notched), 'boundary'); // on the edge (1,2)-(4,2)
  assert.equal(pointInPolygon({ x: 2, y: 3 }, notched), 'outside'); // in the cut-out
});

test('a polygon with fewer than 3 vertices encloses nothing (AC-1, D3)', () => {
  assert.equal(pointInPolygon({ x: 0, y: 0 }, []), 'outside');
  assert.equal(pointInPolygon({ x: 0, y: 0 }, [{ x: 0, y: 0 }]), 'outside');
  assert.equal(
    pointInPolygon({ x: 0, y: 0 }, [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ]),
    'outside',
  );
});

test('a self-intersecting outline gives a stable answer instead of throwing (D5, D6)', () => {
  const bowTie: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 2, y: 2 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
  ];
  // Only "does not throw and answers one of the three" is contracted (the task calls the answer for an invalid
  // polygon best effort). The even-odd rule gives the bow tie two filled triangles, `(0,0),(1,1),(0,2)` and
  // `(2,2),(1,1),(2,0)`; the points below are sampled inside, on and outside it without relying on that reading.
  const samples: readonly Point[] = [
    { x: 0.4, y: 1 },
    { x: 1.6, y: 1 },
    { x: 0.6, y: 0.4 },
    { x: 1, y: 1 },
    { x: 9, y: 9 },
  ];
  const answers = samples.map((point) => pointInPolygon(point, bowTie));
  for (const answer of answers) {
    assert.ok(['inside', 'boundary', 'outside'].includes(answer));
  }
  // Deterministic: the same input always gives the same answer, and the two diagonals stay boundaries.
  assert.deepEqual(
    samples.map((point) => pointInPolygon(point, bowTie)),
    answers,
  );
  assert.equal(pointInPolygon({ x: 9, y: 9 }, bowTie), 'outside');
  assert.equal(pointInPolygon({ x: 1, y: 1 }, bowTie), 'boundary'); // the crossing point itself
});

test('a non-finite point or vertex is a RangeError, not a NaN answer (AC-1)', () => {
  assert.throws(() => pointInPolygon({ x: Number.NaN, y: 0 }, square), RangeError);
  assert.throws(() => pointInPolygon({ x: 0, y: 0 }, [...sq(0, 0, 4, 4).slice(0, 3), { x: 0, y: Number.POSITIVE_INFINITY }]), RangeError);
});

test('the same point is answered the same for both orientations (D3)', () => {
  const clockwise = [...square].reverse();
  assert.equal(pointInPolygon({ x: 2, y: 2 }, clockwise), 'inside');
  assert.equal(pointInPolygon({ x: 5, y: 2 }, clockwise), 'outside');
  assert.equal(pointInPolygon({ x: 0, y: 0 }, clockwise), 'boundary');
});
