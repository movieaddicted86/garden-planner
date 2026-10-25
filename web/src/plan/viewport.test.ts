import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Point } from '@garden-planner/shared';
import { boundsOf, fitToRect, MAX_SCALE, MIN_SCALE, panBy, screenToWorld, worldToScreen, zoomAt } from './viewport.js';
import type { Viewport } from './viewport.js';

/** The viewport of AC-1…AC-3: 100 px per metre with the world origin at the screen origin. */
const V = { scale: 100, originX: 0, originY: 0 };

/** The AC-1 table: screen pixels with awkward fractions, not only whole metres. */
const ROUNDTRIP_POINTS: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 250, y: 50 },
  { x: 1, y: 1 },
  { x: 999.75, y: -0.125 },
  { x: -333.333, y: 777.777 },
  { x: 0.5, y: 0.25 },
  { x: 123456.789, y: -98765.4321 },
  { x: -1, y: -1 },
  { x: 12.5, y: 3000 },
  { x: 0.0001, y: 8.75 },
];

/** The world point under `screenPoint` may not move by more than 1e-9 m across the zoom. */
function assertAnchorFixed(before: Viewport, after: Viewport, screenPoint: Point): void {
  const worldBefore = screenToWorld(before, screenPoint);
  const worldAfter = screenToWorld(after, screenPoint);
  assert.ok(Math.abs(worldAfter.x - worldBefore.x) < 1e-9, `x: ${worldBefore.x} -> ${worldAfter.x}`);
  assert.ok(Math.abs(worldAfter.y - worldBefore.y) < 1e-9, `y: ${worldBefore.y} -> ${worldAfter.y}`);
}

test('AC-1: screenToWorld and worldToScreen are inverse', () => {
  assert.deepEqual(screenToWorld(V, { x: 250, y: 50 }), { x: 2.5, y: 0.5 });
  assert.deepEqual(worldToScreen(V, { x: 2.5, y: 0.5 }), { x: 250, y: 50 });
});

test('AC-1: a roundtrip is exact within 1e-9 for a non-trivial viewport', () => {
  const viewport: Viewport = { scale: 83.33333333333333, originX: -1.75, originY: 2.25 };

  for (const point of ROUNDTRIP_POINTS) {
    const back = screenToWorld(viewport, worldToScreen(viewport, point));
    assert.ok(Math.abs(back.x - point.x) < 1e-9, `x of ${JSON.stringify(point)}: ${back.x}`);
    assert.ok(Math.abs(back.y - point.y) < 1e-9, `y of ${JSON.stringify(point)}: ${back.y}`);
  }
});

test('AC-1: a non-finite point is refused', () => {
  assert.throws(() => worldToScreen(V, { x: Number.NaN, y: 0 }), RangeError);
  assert.throws(() => screenToWorld(V, { x: 0, y: Number.POSITIVE_INFINITY }), RangeError);
});

test('AC-2: zooming keeps the world point under the screen point', () => {
  assert.deepEqual(zoomAt(V, { x: 250, y: 50 }, 2), { scale: 200, originX: 1.25, originY: 0.25 });
  assertAnchorFixed(V, zoomAt(V, { x: 250, y: 50 }, 2), { x: 250, y: 50 });
});

test('AC-2: the anchor point stays fixed when the scale is clamped', () => {
  const atCeiling: Viewport = { scale: 400, originX: 0, originY: 0 };
  const zoomedIn = zoomAt(atCeiling, { x: 250, y: 50 }, 2);
  assert.equal(zoomedIn.scale, MAX_SCALE);
  assertAnchorFixed(atCeiling, zoomedIn, { x: 250, y: 50 });
});

test('AC-2: zooming out at the floor leaves the viewport unchanged', () => {
  const atFloor: Viewport = { scale: 10, originX: 1, originY: 2 };
  assert.deepEqual(zoomAt(atFloor, { x: 250, y: 50 }, 0.5), atFloor);
});

test('AC-2: factors 0, -1 and NaN are refused', () => {
  for (const factor of [0, -1, Number.NaN]) {
    assert.throws(() => zoomAt(V, { x: 250, y: 50 }, factor), RangeError);
  }
  assert.throws(() => zoomAt(V, { x: Number.NaN, y: 50 }, 2), RangeError);
});

test('AC-3: panning moves the content and is its own inverse', () => {
  const panned = panBy(V, 100, -50);
  assert.deepEqual(panned, { scale: 100, originX: -1, originY: 0.5 });
  assert.deepEqual(panBy(panned, -100, 50), V);
});

test('AC-3: the content follows the drag direction', () => {
  // Dragging right by 100 px moves the content right: the world point at the screen origin moved left.
  assert.deepEqual(worldToScreen(panBy(V, 100, 0), { x: 0, y: 0 }), { x: 100, y: 0 });
});

test('AC-3: a non-finite pan delta is refused', () => {
  assert.throws(() => panBy(V, Number.NaN, 0), RangeError);
  assert.throws(() => panBy(V, 0, Number.POSITIVE_INFINITY), RangeError);
});

test('AC-4: boundsOf of the L-shape and of a single point', () => {
  const lShape: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 3 },
    { x: 0, y: 3 },
  ];
  assert.deepEqual(boundsOf(lShape), { minX: 0, minY: 0, maxX: 4, maxY: 3 });
  assert.deepEqual(boundsOf([{ x: 2, y: 5 }]), { minX: 2, minY: 5, maxX: 2, maxY: 5 });
});

test('AC-4: boundsOf of an empty list or a non-finite vertex is refused', () => {
  assert.throws(() => boundsOf([]), RangeError);
  assert.throws(
    () =>
      boundsOf([
        { x: 0, y: 0 },
        { x: Number.NaN, y: 1 },
      ]),
    RangeError,
  );
});

test('AC-4: fitToRect centres the rect and fills the size up to the margin', () => {
  const fitted = fitToRect({ minX: 0, minY: 0, maxX: 10, maxY: 6 }, { width: 1000, height: 600 }, 50);

  assert.equal(fitted.scale, 500 / 6);
  assert.equal(fitted.originX, -1);
  // The exact value is -0.6; `3 - 300 / (500 / 6)` gives -0.6000000000000001, hence the tolerance.
  assert.ok(Math.abs(fitted.originY - -0.6) < 1e-15, `${fitted.originY}`);

  // The rect's centre is the screen centre.
  assert.deepEqual(screenToWorld(fitted, { x: 500, y: 300 }), { x: 5, y: 3 });
});

test('AC-4: fitToRect holds the margin on the constraining axis and clamps the extremes', () => {
  const fitted = fitToRect({ minX: 0, minY: 0, maxX: 10, maxY: 6 }, { width: 1000, height: 600 }, 50);
  const topLeft = worldToScreen(fitted, { x: 0, y: 0 });
  const bottomRight = worldToScreen(fitted, { x: 10, y: 6 });

  // The margin is exact up to the rounding of `scale` itself (the height is the constraining axis here).
  assert.ok(Math.abs(topLeft.y - 50) < 1e-9, `top margin ${topLeft.y}`);
  assert.ok(Math.abs(bottomRight.y - 550) < 1e-9, `bottom margin ${bottomRight.y}`);
  assert.ok(topLeft.x > 0 && bottomRight.x < 1000, `the free axis keeps more than the margin: ${topLeft.x}..${bottomRight.x}`);

  assert.equal(fitToRect({ minX: 0, minY: 0, maxX: 100000, maxY: 100000 }, { width: 1000, height: 600 }, 40).scale, MIN_SCALE);
  assert.equal(fitToRect({ minX: 0, minY: 0, maxX: 0.0001, maxY: 0.0001 }, { width: 1000, height: 600 }, 40).scale, MAX_SCALE);
  // A rect without extent (one point) has no "largest" scale; the clamp is what keeps this finite.
  assert.equal(fitToRect({ minX: 3, minY: 3, maxX: 3, maxY: 3 }, { width: 1000, height: 600 }, 40).scale, MAX_SCALE);
});
