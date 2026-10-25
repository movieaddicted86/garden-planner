import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gridLines, niceGridStep, scaleBar } from './grid.js';

/** The AC-6 viewport: 100 px per metre, 300 x 200 px canvas. */
const V = { scale: 100, originX: 0, originY: 0 };
const SIZE = { width: 300, height: 200 };

test('AC-5: niceGridStep picks the smallest step at or above 24 px', () => {
  assert.equal(niceGridStep(100), 0.25);
  assert.equal(niceGridStep(10), 5);
  assert.equal(niceGridStep(500), 0.1);
  assert.equal(niceGridStep(40), 1);
  assert.equal(niceGridStep(24), 1);
  // At 2000 px/m the finest step already fits: there is nothing smaller to fall back to.
  assert.equal(niceGridStep(2000), 0.1);
});

test('AC-5: the chosen step is never narrower than 24 px inside the scale range', () => {
  for (let scale = 10; scale <= 500; scale += 1) {
    const step = niceGridStep(scale);
    if (step > 0.1) {
      assert.ok(step * scale >= 24, `step ${step} at scale ${scale} is ${step * scale} px`);
    }
    // The step below the chosen one would be too narrow (except where the range starts).
    const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];
    const index = steps.indexOf(step);
    if (index > 0) assert.ok(steps[index - 1] * scale < 24, `step ${steps[index - 1]} at scale ${scale} would also fit`);
  }
});

test('AC-6: gridLines returns the multiples of the step inside the visible rectangle', () => {
  assert.deepEqual(gridLines(V, SIZE, 1), { xs: [0, 1, 2, 3], ys: [0, 1, 2] });
  assert.deepEqual(gridLines({ scale: 100, originX: 0.5, originY: 0.5 }, SIZE, 1), { xs: [1, 2, 3], ys: [1, 2] });
});

test('AC-6: a step of 0.1 has no floating point residue', () => {
  const { xs } = gridLines(V, SIZE, 0.1);
  assert.ok(xs.includes(0.3), `0.3 missing from ${xs.join(', ')}`);
  assert.equal(
    xs.find((x) => x > 0.2 && x < 0.4),
    0.3,
  );
  assert.deepEqual(gridLines(V, { width: 10, height: 10 }, 0.1).xs, [0, 0.1]);
});

test('AC-6: a line exactly on the viewport edge is kept', () => {
  // The visible world x range is [0, 3]; 3 / 0.1 is 29.999999999999996 in binary floating point.
  assert.equal(gridLines(V, SIZE, 0.1).xs.at(-1), 3);
  assert.deepEqual(gridLines(V, SIZE, 0.1).xs.slice(0, 4), [0, 0.1, 0.2, 0.3]);
});

test('AC-6: gridLines follows the origin and the step given', () => {
  assert.deepEqual(gridLines({ scale: 100, originX: 1, originY: -1 }, SIZE, 1), { xs: [1, 2, 3, 4], ys: [-1, 0, 1] });
  assert.deepEqual(gridLines(V, SIZE, 10), { xs: [0], ys: [0] });
  // A viewport outside the multiples of the step has no lines at all, not a line at 0.
  assert.deepEqual(gridLines({ scale: 100, originX: 0.2, originY: 0.2 }, SIZE, 5), { xs: [], ys: [] });
});

test('AC-6: gridLines refuses a step that is not a positive finite number', () => {
  for (const step of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => gridLines(V, SIZE, step), RangeError);
  }
});

test('AC-7: scaleBar picks the longest bar of at most 150 px', () => {
  assert.deepEqual(scaleBar(100), { meters: 1, pixels: 100 });
  assert.deepEqual(scaleBar(10), { meters: 10, pixels: 100 });
  assert.deepEqual(scaleBar(500), { meters: 0.2, pixels: 100 });
  assert.deepEqual(scaleBar(200), { meters: 0.5, pixels: 100 });
});

test('AC-7: the bar never exceeds 150 px or 100 m', () => {
  // The legal scale range is MIN_SCALE..MAX_SCALE; there the widest step is 500 px/m * 0.1 m = 50 px.
  for (const scale of [10, 11, 24, 40, 100, 200, 333, 500]) {
    const bar = scaleBar(scale);
    assert.ok(bar.pixels <= 150, `${bar.pixels} px at scale ${scale}`);
    assert.ok(bar.meters <= 100, `${bar.meters} m at scale ${scale}`);
  }
  // Below the shortest candidate even 100 m is too short; the longest labelled bar is still the sensible answer.
  assert.deepEqual(scaleBar(1), { meters: 100, pixels: 100 });
});
