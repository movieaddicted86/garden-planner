import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidPolygon, validatePolygon, GEOMETRY_EPSILON, type Point, type PolygonIssue } from '../index.js';

/** A regular `n`-gon of radius 1, counter-clockwise (AC-2: circle approximation). */
function regularPolygon(n: number): readonly Point[] {
  return Array.from({ length: n }, (_unused, i) => {
    const angle = (2 * Math.PI * i) / n;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}

/** The pentagram of AC-4: a regular pentagon visited in steps of two, so every edge skips a vertex. */
function pentagram(): readonly Point[] {
  return Array.from({ length: 5 }, (_unused, i) => {
    const angle = (4 * Math.PI * i) / 5;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}

function translated(points: readonly Point[], dx: number, dy: number): readonly Point[] {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

/** Issue pairs as `[edgeA, edgeB]`, for readable assertions. */
function pairs(issues: readonly PolygonIssue[]): [number, number][] {
  return issues.map((issue) => {
    if (issue.kind !== 'self_intersection') {
      throw new Error(`expected no non-intersection issue, got ${issue.kind}`);
    }
    return [issue.edgeA, issue.edgeB];
  });
}

const selfIntersections = (points: readonly Point[]): [number, number][] => pairs(validatePolygon(points));

const unitSquare: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

const lShape: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 3 },
  { x: 0, y: 3 },
];

// Edges 0 (0,0)-(2,2) and 2 (2,0)-(0,2) cross at (1,1) (AC-3).
const bowTie: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 2, y: 2 },
  { x: 2, y: 0 },
  { x: 0, y: 2 },
];

// Vertex 3 (2,0) lies on edge 0 (0,0)-(4,0) (AC-5, AC-6).
function tJunction(height: number): readonly Point[] {
  return [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 2, y: height },
    { x: 0, y: 4 },
  ];
}

const validPolygons: [string, readonly Point[]][] = [
  ['the unit square', unitSquare],
  ['a concave L-shape', lShape],
  [
    'a triangle',
    [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ],
  ],
  ['a regular 20-gon', regularPolygon(20)],
  ['the unit square shifted by 10 km', translated(unitSquare, 10000, 10000)],
];

test('validatePolygon and isValidPolygon are importable from the package entry point', () => {
  assert.ok(typeof validatePolygon === 'function');
  assert.ok(typeof isValidPolygon === 'function');
  assert.equal(GEOMETRY_EPSILON, 1e-9);
});

test('a simple polygon has no issue (AC-2)', () => {
  for (const [name, polygon] of validPolygons) {
    assert.deepEqual(validatePolygon(polygon), [], `${name} should be valid`);
    assert.equal(isValidPolygon(polygon), true, `${name} should be valid`);
  }
});

test('the bow tie reports exactly the crossing of edges 0 and 2 (AC-3)', () => {
  assert.deepEqual(validatePolygon(bowTie), [{ kind: 'self_intersection', edgeA: 0, edgeB: 2 }]);
  assert.equal(isValidPolygon(bowTie), false);
});

test('the bow tie gives the same result 10 km away (AC-3)', () => {
  assert.deepEqual(selfIntersections(translated(bowTie, 10000, 10000)), [[0, 2]]);
});

test('the pentagram reports its five crossings (AC-4)', () => {
  assert.deepEqual(selfIntersections(pentagram()), [
    [0, 2],
    [0, 3],
    [1, 3],
    [1, 4],
    [2, 4],
  ]);
});

test('a vertex lying on another edge is a T-junction, not a silent pass (AC-5)', () => {
  assert.deepEqual(selfIntersections(tJunction(0)), [
    [0, 2],
    [0, 3],
  ]);
});

test('the tolerance separates a millimetre from a picometre (AC-6)', () => {
  assert.deepEqual(validatePolygon(tJunction(1e-6)), []);
  assert.deepEqual(selfIntersections(tJunction(1e-12)), [
    [0, 2],
    [0, 3],
  ]);
});

test('an edge folding back onto its neighbour is reported (AC-7)', () => {
  const foldBack: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 3 },
  ];
  assert.deepEqual(validatePolygon(foldBack), [
    { kind: 'self_intersection', edgeA: 0, edgeB: 1 },
    { kind: 'self_intersection', edgeA: 0, edgeB: 2 },
  ]);
});

test('a repeated vertex is reported on its own, without intersection noise (AC-8)', () => {
  const repeatedMiddle: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ];
  assert.deepEqual(validatePolygon(repeatedMiddle), [{ kind: 'duplicate_vertex', index: 1 }]);

  // D3: a closed ring typed with a repeated first point; the repeat is the closing vertex, so index 4.
  const repeatedFirst: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
    { x: 0, y: 0 },
  ];
  assert.deepEqual(validatePolygon(repeatedFirst), [{ kind: 'duplicate_vertex', index: 4 }]);
  assert.equal(isValidPolygon(repeatedFirst), false);
});

test('fewer than 3 points is its own issue (AC-9)', () => {
  for (const polygon of [
    [] as readonly Point[],
    [{ x: 1, y: 2 }],
    [
      { x: 0, y: 0 },
      { x: 4, y: 4 },
    ],
  ]) {
    assert.deepEqual(validatePolygon(polygon), [{ kind: 'too_few_points' }]);
    assert.equal(isValidPolygon(polygon), false);
  }
});

test('every invalid case above fails isValidPolygon (AC-9)', () => {
  for (const polygon of [bowTie, tJunction(0), tJunction(1e-12), pentagram()]) {
    assert.equal(isValidPolygon(polygon), false);
  }
});

test('a triangle has only adjacent edges, so it never reports a crossing (AC-10)', () => {
  const triangle: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 0, y: 3 },
  ];
  assert.deepEqual(validatePolygon(triangle), []);

  // A degenerate, collinear "triangle": the edges fold back onto each other.
  assert.deepEqual(
    selfIntersections([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
    ]),
    [
      [0, 1],
      [0, 2],
    ],
  );
});

test('a non-finite coordinate throws a RangeError naming the vertex', () => {
  assert.throws(
    () =>
      validatePolygon([
        { x: 0, y: 0 },
        { x: Number.NaN, y: 0 },
        { x: 1, y: 1 },
      ]),
    (error: unknown) => error instanceof RangeError && error.message.includes('vertex 1'),
  );
  assert.throws(
    () =>
      isValidPolygon([
        { x: 0, y: Number.POSITIVE_INFINITY },
        { x: 1, y: 0 },
      ]),
    RangeError,
  );
});
