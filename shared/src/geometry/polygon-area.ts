import { assertFinitePoints } from './assert-finite-points.js';
import type { Point } from './point.js';

/**
 * Area of the polygon in m² (shoelace, D4): always >= 0, the same for clockwise and counter-clockwise input (D3).
 * Coordinates are made relative to the first vertex so a plot far from the origin does not lose precision.
 */
export function polygonArea(points: readonly Point[]): number {
  assertFinitePoints(points, 'polygonArea');

  if (points.length < 3) {
    return 0;
  }

  const origin = points[0];
  let twiceArea = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    twiceArea += (a.x - origin.x) * (b.y - origin.y) - (b.x - origin.x) * (a.y - origin.y);
  }

  return Math.abs(twiceArea) / 2;
}
