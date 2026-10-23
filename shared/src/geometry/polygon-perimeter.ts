import { assertFinitePoints } from './assert-finite-points.js';
import type { Point } from './point.js';

/**
 * Perimeter of the polygon in m: the sum of all edge lengths **including the closing edge** (D4).
 * Edge `i` runs from vertex `i` to vertex `(i + 1) mod n`, so a vertex list without a repeated closing
 * vertex (D3) gives the full outline exactly once. Fewer than 3 points are not a polygon and have no
 * perimeter.
 */
export function polygonPerimeter(points: readonly Point[]): number {
  assertFinitePoints(points, 'polygonPerimeter');

  if (points.length < 3) {
    return 0;
  }

  let perimeter = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    perimeter += Math.hypot(b.x - a.x, b.y - a.y);
  }

  return perimeter;
}
