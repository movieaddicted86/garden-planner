import { assertFinitePoint, assertFinitePoints } from './assert-finite-points.js';
import { distanceToSegment, edgeEnd, GEOMETRY_EPSILON } from './polygon-primitives.js';
import type { Point } from './point.js';

/** Where a point lies relative to a polygon (D6). */
export type PointLocation = 'inside' | 'boundary' | 'outside';

/** `true` when `point` is within `GEOMETRY_EPSILON` of the edge `a`–`b`, its endpoints included. */
function isOnEdge(point: Point, a: Point, b: Point): boolean {
  return distanceToSegment(point, a, b) <= GEOMETRY_EPSILON;
}

/**
 * Even-odd ray casting: a ray to the right of `point` is tested against every edge, and an odd number of
 * crossings counts as inside. The half-open y-comparison (`a.y > y !== b.y > y`) counts a vertex the ray passes
 * through exactly once, so it does not flip the result twice; an edge parallel to the ray never contributes
 * (both endpoints then compare the same way).
 */
function countCrossings(point: Point, polygon: readonly Point[]): number {
  let crossings = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = edgeEnd(polygon, i);
    if (a.y > point.y !== b.y > point.y) {
      // x of the edge at the height of the ray; `b.y - a.y` is not 0 here (the comparison above is true only then).
      const xAtRay = a.x + ((point.y - a.y) * (b.x - a.x)) / (b.y - a.y);
      if (xAtRay > point.x) {
        crossings += 1;
      }
    }
  }
  return crossings;
}

/**
 * Where `point` lies relative to `polygon`: `'inside'`, `'boundary'` or `'outside'` (D6).
 *
 * `'boundary'` — and not `'inside'` — whenever the point is within `GEOMETRY_EPSILON` of an edge: a vertex, the
 * flat of an edge, or a point whose nearest edge point is an endpoint. Treating the outline as inside would let
 * two zones that only touch count as overlapping, which D6 forbids, so the two answers are kept apart here.
 * Everything else is decided by even-odd ray casting.
 *
 * Fewer than 3 vertices are no polygon (D3) and enclose nothing: the answer is `'outside'`. A self-intersecting
 * outline (D5) has no interior the even-odd rule agrees with, but it has a stable one and the function does not
 * throw — the caller marks such a zone invalid instead of asking where a point lies. Non-finite coordinates →
 * `RangeError`, as in the other geometry entry points.
 */
export function pointInPolygon(point: Point, polygon: readonly Point[]): PointLocation {
  assertFinitePoint(point, 'pointInPolygon');
  assertFinitePoints(polygon, 'pointInPolygon');

  if (polygon.length < 3) {
    return 'outside';
  }

  for (let i = 0; i < polygon.length; i += 1) {
    if (isOnEdge(point, polygon[i], edgeEnd(polygon, i))) {
      return 'boundary';
    }
  }

  return countCrossings(point, polygon) % 2 === 1 ? 'inside' : 'outside';
}
