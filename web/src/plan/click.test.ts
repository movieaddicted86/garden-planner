import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CLICK_MAX_PX, gestureDistance, isClick } from './click.js';

/** A gesture from the origin to `to`. */
function gestureTo(x: number, y: number) {
  return { from: { x: 0, y: 0 }, to: { x, y } };
}

test('AC-1: 3.9 px is a click, 4 px is a pan', () => {
  assert.equal(isClick(gestureTo(3.9, 0)), true);
  assert.equal(isClick(gestureTo(0, 3.9)), true);
  // the boundary is exclusive: exactly the limit is already a drag
  assert.equal(isClick(gestureTo(CLICK_MAX_PX, 0)), false);
  assert.equal(isClick(gestureTo(4, 0)), false);
  assert.equal(isClick(gestureTo(4.1, 0)), false);
});

test('AC-1: a diagonal movement is judged by its Euclidean distance', () => {
  // 3 px in x and 3 px in y travelled 4.24 px, so it is a pan; a per-axis test would call it a click.
  assert.equal(gestureDistance(gestureTo(3, 3)), Math.hypot(3, 3));
  assert.equal(isClick(gestureTo(3, 3)), false);
  // 2.8 px on the diagonal is 3.96 px and stays a click
  assert.equal(isClick(gestureTo(2.8, 2.8)), true);
  // the same distance in the negative direction counts the same
  assert.equal(isClick(gestureTo(-3, -3)), false);
});

test('AC-1: a gesture that does not move at all is a click', () => {
  assert.equal(gestureDistance(gestureTo(0, 0)), 0);
  assert.equal(isClick(gestureTo(0, 0)), true);
});

test('AC-1: the distance is measured between the gesture ends, not from the origin', () => {
  const gesture = { from: { x: 100, y: 200 }, to: { x: 103, y: 204 } };
  assert.equal(gestureDistance(gesture), 5);
  assert.equal(isClick(gesture), false);

  const nearby = { from: { x: -50, y: 25 }, to: { x: -48, y: 24 } };
  assert.equal(isClick(nearby), true);
});
