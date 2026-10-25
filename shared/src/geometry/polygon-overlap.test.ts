import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPolygonInside, polygonsOverlap, type Point } from '../index.js';

/** `sq(x0, y0, x1, y1)`: the axis-aligned rectangle with those corners (AC-2), in the plan orientation (D1). */
function sq(x0: number, y0: number, x1: number, y1: number): readonly Point[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

/** The L-shape of AC-3: horizontal arm `x 0..4, y 0..1`, vertical arm `x 0..1, y 0..3`, notch `x 1..4, y 1..3`. */
const lShape: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 3 },
  { x: 0, y: 3 },
];

const square = sq(0, 0, 4, 4);

test('two squares sharing a region overlap, both argument orders (AC-2)', () => {
  const other = sq(2, 2, 6, 6);
  assert.equal(polygonsOverlap(square, other), true);
  assert.equal(polygonsOverlap(other, square), true);
});

test('two squares sharing an edge touch but do not overlap (AC-2, D6)', () => {
  // The whole point of D6: neighbouring zones are laid next to each other, their common border is no overlap.
  const rightOfSquare = sq(4, 0, 8, 4);
  assert.equal(polygonsOverlap(square, rightOfSquare), false);
  assert.equal(polygonsOverlap(rightOfSquare, square), false);
});

test('two squares sharing only a corner do not overlap (AC-2, D6)', () => {
  const diagonal = sq(4, 4, 8, 8);
  assert.equal(polygonsOverlap(square, diagonal), false);
  assert.equal(polygonsOverlap(diagonal, square), false);
});

test('two squares apart do not overlap (AC-2)', () => {
  assert.equal(polygonsOverlap(square, sq(5, 5, 6, 6)), false);
  assert.equal(polygonsOverlap(sq(5, 5, 6, 6), square), false);
});

test('a square contained in another overlaps it, both argument orders (AC-2)', () => {
  const small = sq(1, 1, 2, 2);
  assert.equal(polygonsOverlap(square, small), true);
  assert.equal(polygonsOverlap(small, square), true);
});

test('a square overlaps itself, so a duplicated zone is caught (AC-2)', () => {
  assert.equal(polygonsOverlap(square, square), true);
});

test('an extra collinear vertex does not change the answer (AC-2)', () => {
  // The same square with (2,0) inserted on its first edge. No vertex of one lies inside the other (every vertex
  // of either is on the other's outline), so only the third probe — an edge midpoint moved inwards — can find the
  // overlap, in both argument orders.
  const withExtraCollinearVertex: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
  ];
  assert.equal(withExtraCollinearVertex.length, 5);
  assert.equal(polygonsOverlap(square, withExtraCollinearVertex), true);
  assert.equal(polygonsOverlap(withExtraCollinearVertex, square), true);
});

test('a square exactly on top of a shifted copy is found in both orders (AC-2, probe 3)', () => {
  // Only probe 3 can decide this case: no edges properly cross (they are parallel or collinear) and no vertex is
  // strictly inside the other. Moving an edge midpoint inwards by 1e-6 m lands in the shared interior.
  const shifted = sq(0, 0.0000005, 4, 4); // shifted up by 5e-7 m, far below the probe offset
  assert.equal(polygonsOverlap(square, shifted), true);
  assert.equal(polygonsOverlap(shifted, square), true);
});

test('the inward probe follows the orientation of the outline (D3, probe 3)', () => {
  // The same two squares with the second one given clockwise: its shoelace sum is negative, so "inward" is the
  // other normal. A sign error would probe outwards and report false.
  const clockwise = [...sq(2, 2, 6, 6)].reverse();
  assert.equal(polygonsOverlap(square, clockwise), true);
  assert.equal(polygonsOverlap(clockwise, square), true);
});

test('the L-shape against a square in its notch does not overlap (AC-3)', () => {
  // The bounding boxes do overlap: only a real point test can answer this.
  const inNotch = sq(2, 2, 3, 3);
  assert.equal(polygonsOverlap(lShape, inNotch), false);
  assert.equal(polygonsOverlap(inNotch, lShape), false);
});

test('the L-shape against a square inside each of its arms overlaps (AC-3)', () => {
  const inVerticalArm = sq(0.2, 1.5, 0.8, 2.5);
  const inHorizontalArm = sq(3, 0.2, 3.5, 0.8);
  assert.equal(polygonsOverlap(lShape, inVerticalArm), true);
  assert.equal(polygonsOverlap(inVerticalArm, lShape), true);
  assert.equal(polygonsOverlap(lShape, inHorizontalArm), true);
  assert.equal(polygonsOverlap(inHorizontalArm, lShape), true);
});

test('an overlap narrower than the probe offset is the documented blind spot (AC-2, doc comment)', () => {
  // A square shifted right so the two share only a 1e-7 m wide strip: below INWARD_PROBE_OFFSET (1e-6 m), so the
  // inward probe jumps across it and no vertex lands strictly inside (the sliver's left corners lie on the
  // square's outline, which is 'boundary'). Pinned so the limitation is a known, tested property; the task
  // requires it to be named in the doc comment. The harmless direction: a warning too few, never one too many.
  const sliver = sq(4 - 0.0000001, 0, 8, 4);
  assert.equal(polygonsOverlap(square, sliver), false);
  // Ten times wider than the probe offset the same construction is found, so the miss is the offset's size and
  // not a broken probe.
  assert.equal(polygonsOverlap(square, sq(4 - 0.00001, 0, 8, 4)), true);
});

test('a self-intersecting polygon does not make the overlap test throw (AC-6, D5)', () => {
  const bowTie: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 2, y: 2 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
  ];
  assert.doesNotThrow(() => polygonsOverlap(bowTie, square));
  assert.doesNotThrow(() => polygonsOverlap(bowTie, bowTie));
  assert.equal(typeof polygonsOverlap(bowTie, square), 'boolean');
});

test('a non-finite vertex is a RangeError (AC-2)', () => {
  assert.throws(() => polygonsOverlap([...square.slice(0, 3), { x: Number.NaN, y: 0 }], sq(1, 1, 2, 2)), RangeError);
  assert.throws(
    () =>
      polygonsOverlap(square, [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: Number.NEGATIVE_INFINITY },
      ]),
    RangeError,
  );
});

test('a rectangle inside another is inside, a shared outline included (AC-5)', () => {
  assert.equal(isPolygonInside(sq(1, 1, 3, 3), square), true);
  assert.equal(isPolygonInside(square, square), true);
  assert.equal(isPolygonInside(sq(0, 0, 4, 2), square), true); // shares three edges of the outer square
  assert.equal(isPolygonInside(sq(0, 1, 0, 3), square), true); // a zero-width edge lying on the left border
});

test('a rectangle reaching beyond the outer outline is not inside (AC-5)', () => {
  assert.equal(isPolygonInside(sq(1, 1, 5, 3), square), false);
  assert.equal(isPolygonInside(sq(5, 5, 6, 6), square), false);
});

test('the concave L-shape decides containment by more than its vertices (AC-5)', () => {
  // In the notch: no vertex is inside, and edges only touch, so the crossing test alone would say "inside".
  assert.equal(isPolygonInside(sq(2, 2, 3, 3), lShape), false);
  // Inside the vertical arm, well away from the outline.
  assert.equal(isPolygonInside(sq(0.2, 0.2, 0.8, 2.8), lShape), true);
  // Its corners lie inside the two arms, but the edge midpoints fall in the notch: the chord across the inner
  // corner. This is the case that needs the midpoint test (AC-5).
  assert.equal(isPolygonInside(sq(0.2, 0.2, 3.8, 2.8), lShape), false);
});

test('a shape that merely crosses the outer outline is not inside (AC-5)', () => {
  assert.equal(isPolygonInside(sq(3, 3, 9, 9), lShape), false);
  assert.equal(isPolygonInside(sq(0.5, 0.5, 3, 3), lShape), false);
});

test('a non-finite vertex is a RangeError in the containment test too (AC-5)', () => {
  assert.throws(
    () =>
      isPolygonInside(
        [
          { x: 0, y: 0 },
          { x: Number.NaN, y: 0 },
          { x: 1, y: 1 },
        ],
        square,
      ),
    RangeError,
  );
  assert.throws(
    () =>
      isPolygonInside(square, [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: Number.POSITIVE_INFINITY, y: 1 },
      ]),
    RangeError,
  );
});

/**
 * A 32-bit linear congruential generator with the constants of Numerical Recipes, seeded with a fixed value
 * (AC-4): `Math.random` would make a failure impossible to reproduce, and the task forbids it. The **high** bits
 * of the state are used — the low bits of an LCG are notoriously non-random, and an earlier task's property loop
 * was vacuous because it read them (T-005 report).
 */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state >>> 16) / 65536; // high 16 bits -> [0, 1)
  };
}

test('300 pseudo-random rectangles: overlap equals the interval rule (AC-4)', () => {
  const random = makeRandom(0x5eed1234);
  const intIn0To10 = () => Math.floor(random() * 11); // 0..10 inclusive

  // Two counters make the loop's non-vacuity visible: if the generator or the rectangle builder broke, one of
  // the counts below would collapse and the assertions at the end fail loudly instead of the loop passing over an
  // empty comparison (T-005: a vacuous property loop that looked green).
  let overlapping = 0;
  let separated = 0;

  for (let i = 0; i < 300; i += 1) {
    const x0 = intIn0To10();
    const y0 = intIn0To10();
    const x1 = x0 + 1 + intIn0To10(); // positive width
    const y1 = y0 + 1 + intIn0To10(); // positive height
    const u0 = intIn0To10();
    const v0 = intIn0To10();
    const u1 = u0 + 1 + intIn0To10();
    const v1 = v0 + 1 + intIn0To10();

    const a = sq(x0, y0, x1, y1);
    const b = sq(u0, v0, u1, v1);
    const expected = Math.max(x0, u0) < Math.min(x1, u1) && Math.max(y0, v0) < Math.min(y1, v1);

    assert.equal(polygonsOverlap(a, b), expected, `pair ${i}: [${x0},${y0},${x1},${y1}] vs [${u0},${v0},${u1},${v1}]`);
    assert.equal(polygonsOverlap(b, a), expected, `pair ${i} swapped`);
    if (expected) {
      overlapping += 1;
    } else {
      separated += 1;
    }
  }

  assert.equal(overlapping + separated, 300);
  // The sample must contain both outcomes: a generator that always produced the same corner would make every
  // comparison trivial. Observed split in this run is asserted to be non-degenerate, not a fixed number.
  assert.ok(overlapping > 20, `expected some overlapping pairs, got ${overlapping}`);
  assert.ok(separated > 20, `expected some separated pairs, got ${separated}`);
});

test('300 pseudo-random rectangles: containment equals the interval rule (AC-5)', () => {
  // Derived from a random outer rectangle, so the sample carries both outcomes by construction: each corner is
  // moved by a random offset in -2..2, which nests the inner rectangle when the offsets point inwards and lets it
  // stick out when they point outwards. Independent random pairs would be right about the rule too, but almost
  // every one of them would happen to be "not contained" and the property would rarely touch the interesting
  // direction (see the note on AC-4).
  const random = makeRandom(0xc0ffee);
  const intIn0To10 = () => Math.floor(random() * 11);
  const offset = () => Math.floor(random() * 5) - 2; // -2..2
  let contained = 0;

  for (let i = 0; i < 300; i += 1) {
    const x0 = intIn0To10();
    const y0 = intIn0To10();
    const x1 = x0 + 2 + intIn0To10(); // wide enough that a 2 m inset on both sides keeps a positive width
    const y1 = y0 + 2 + intIn0To10();
    const ux0 = x0 + offset();
    const uy0 = y0 + offset();
    const ux1 = Math.max(ux0 + 1, x1 + offset()); // positive width always
    const uy1 = Math.max(uy0 + 1, y1 + offset());

    const outer = sq(x0, y0, x1, y1);
    const inner = sq(ux0, uy0, ux1, uy1);
    const expected = x0 <= ux0 && ux1 <= x1 && y0 <= uy0 && uy1 <= y1;

    assert.equal(isPolygonInside(inner, outer), expected, `pair ${i}: [${ux0},${uy0},${ux1},${uy1}] in [${x0},${y0},${x1},${y1}]`);
    if (expected) {
      contained += 1;
    }
  }

  // Both outcomes must occur, or the property never exercised one of its directions.
  assert.ok(contained > 20, `expected some contained pairs, got ${contained}`);
  assert.ok(contained < 280, `expected some non-contained pairs, got ${300 - contained}`);
});
