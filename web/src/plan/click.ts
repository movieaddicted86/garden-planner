import type { Point } from '@garden-planner/shared';

/**
 * How far the pointer may travel between down and up and still count as a click, in CSS pixels. A touch or a
 * slightly shaky mouse hand moves a pixel or two; dragging the plan moves tens of pixels. The boundary is
 * exclusive: exactly 4 px is already a drag, which is what the task's AC-1 pins.
 */
export const CLICK_MAX_PX = 4;

/** Where a pointer gesture started and where it ended, in screen coordinates. */
export interface PointerGesture {
  readonly from: Point;
  readonly to: Point;
}

/** The straight-line distance between down and up, in CSS pixels. */
export function gestureDistance(gesture: PointerGesture): number {
  return Math.hypot(gesture.to.x - gesture.from.x, gesture.to.y - gesture.from.y);
}

/**
 * `true` when the gesture is a click rather than a pan: the pointer moved **less than** `CLICK_MAX_PX` between
 * down and up. The distance is Euclidean on purpose — a diagonal movement of 3 px in x and 3 px in y has moved
 * 4.24 px and is a drag, which a per-axis test would call a click.
 *
 * Pure, so the rule is unit-tested on its own and the plan's pointer handlers only have to record two points.
 */
export function isClick(gesture: PointerGesture): boolean {
  return gestureDistance(gesture) < CLICK_MAX_PX;
}
