import assert from 'node:assert/strict';
import { test } from 'node:test';
import { polygonArea, type Point } from '../index.js';

const rectangle: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 3, y: 4 },
  { x: 0, y: 4 },
];

// Concave L-shape; its convex hull would give 9 m², so the value pins the real outline (AC-3).
const lShape: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 3 },
  { x: 0, y: 3 },
];

function reversed(points: readonly Point[]): readonly Point[] {
  return [...points].reverse();
}

test('polygonArea is importable from the package entry point', () => {
  assert.ok(typeof polygonArea === 'function');
});

test('the unit square has an area of 1 m²', () => {
  const square: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  assert.equal(polygonArea(square), 1);
});

test('the 3 x 4 rectangle has an area of 12 m²', () => {
  assert.equal(polygonArea(rectangle), 12);
});

test('a right triangle with legs 3 and 4 has an area of 6 m²', () => {
  const triangle: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 0, y: 4 },
  ];
  assert.equal(polygonArea(triangle), 6);
});

test('reversing the vertex order gives the same positive value', () => {
  assert.equal(polygonArea(rectangle), 12);
  assert.equal(polygonArea(reversed(rectangle)), 12);
  assert.equal(polygonArea(lShape), 6);
  assert.equal(polygonArea(reversed(lShape)), 6);
});

test('the concave L-shape has an area of 6 m²', () => {
  assert.equal(polygonArea(lShape), 6);
});

test('fewer than 3 points have no area', () => {
  assert.equal(polygonArea([]), 0);
  assert.equal(polygonArea([{ x: 1, y: 2 }]), 0);
  assert.equal(
    polygonArea([
      { x: 0, y: 0 },
      { x: 4, y: 4 },
    ]),
    0,
  );
});

test('three collinear points have no area', () => {
  assert.equal(
    polygonArea([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]),
    0,
  );
});

test('a plot far from the origin keeps its area', () => {
  const translated: readonly Point[] = [
    { x: 1e8, y: 1e8 },
    { x: 1e8 + 1, y: 1e8 },
    { x: 1e8 + 1, y: 1e8 + 1 },
    { x: 1e8, y: 1e8 + 1 },
  ];
  assert.equal(polygonArea(translated), 1);
});

test('a non-finite coordinate throws a RangeError naming the vertex', () => {
  assert.throws(
    () =>
      polygonArea([
        { x: 0, y: 0 },
        { x: Number.NaN, y: 0 },
        { x: 1, y: 1 },
      ]),
    (error: unknown) => error instanceof RangeError && error.message.includes('vertex 1'),
  );
  assert.throws(
    () =>
      polygonArea([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: Number.POSITIVE_INFINITY, y: 1 },
      ]),
    (error: unknown) => error instanceof RangeError && error.message.includes('vertex 3'),
  );
});
