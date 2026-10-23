import assert from 'node:assert/strict';
import { test } from 'node:test';
import { polygonPerimeter, type Point } from '../index.js';

const unitSquare: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

// 3-4-5: legs 3 and 4, hypotenuse 5 -> 12 (AC-1).
const rightTriangle: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 0, y: 4 },
];

const rectangle2x3: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 3 },
  { x: 0, y: 3 },
];

test('polygonPerimeter is importable from the package entry point', () => {
  assert.ok(typeof polygonPerimeter === 'function');
});

test('the unit square has a perimeter of 4 m', () => {
  assert.equal(polygonPerimeter(unitSquare), 4);
});

test('the 3-4-5 right triangle has a perimeter of 12 m', () => {
  assert.equal(polygonPerimeter(rightTriangle), 12);
});

test('the 2 x 3 rectangle has a perimeter of 10 m, also in reversed order', () => {
  assert.equal(polygonPerimeter(rectangle2x3), 10);
  assert.equal(polygonPerimeter([...rectangle2x3].reverse()), 10);
});

test('the closing edge is part of the perimeter (D4)', () => {
  // An open polyline 0-1-2 would be 2 + 2 = 4; the polygon adds the closing edge 1 -> 5.
  const triangle: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
  ];
  const openLength = Math.hypot(2, 0) + Math.hypot(1, 1);
  assert.equal(polygonPerimeter(triangle), openLength + Math.hypot(1, 1));
});

test('fewer than 3 points have no perimeter', () => {
  assert.equal(polygonPerimeter([]), 0);
  assert.equal(polygonPerimeter([{ x: 1, y: 2 }]), 0);
  assert.equal(
    polygonPerimeter([
      { x: 0, y: 0 },
      { x: 4, y: 4 },
    ]),
    0,
  );
});

test('a diagonal edge is exact, not approximated', () => {
  const square: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ];
  assert.equal(polygonPerimeter(square), 2 + Math.SQRT2);
});

test('a plot far from the origin keeps its perimeter', () => {
  const translated: readonly Point[] = unitSquare.map((p) => ({ x: p.x + 10000, y: p.y + 10000 }));
  assert.equal(polygonPerimeter(translated), 4);
});

test('a non-finite coordinate throws a RangeError naming the vertex', () => {
  assert.throws(
    () =>
      polygonPerimeter([
        { x: 0, y: 0 },
        { x: Number.NaN, y: 0 },
        { x: 1, y: 1 },
      ]),
    (error: unknown) => error instanceof RangeError && error.message.includes('vertex 1'),
  );
  assert.throws(
    () =>
      polygonPerimeter([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: Number.NEGATIVE_INFINITY, y: 1 },
      ]),
    (error: unknown) => error instanceof RangeError && error.message.includes('vertex 3'),
  );
});
