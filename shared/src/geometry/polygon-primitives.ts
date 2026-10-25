import type { Point } from './point.js';

/**
 * Distance in metres below which two shapes count as touching. The tolerance is absolute, not relative: plan
 * coordinates are metres in one garden (a few dozen metres across, never more than a few kilometres from the
 * origin), so a length computed from them in double precision carries an error of ~1e-16 relative — orders of
 * magnitude below 1e-9 m (1 nm), a length no drawing or input can express on purpose.
 */
export const GEOMETRY_EPSILON = 1e-9;

/**
 * The small polygon helpers more than one geometry module needs: edge lookup, point-to-segment distance,
 * orientation and the proper-crossing test. They used to be private to `polygon-validity.ts`; point-in-polygon
 * and the overlap tests need the same definitions (D4, D6), and a second copy is how two of them drift apart.
 */

/** Edge `i` ends at vertex `(i + 1) mod n` (D4): a polygon has no repeated closing vertex (D3). */
export function edgeEnd(points: readonly Point[], index: number): Point {
  return points[(index + 1) % points.length];
}

/** Distance from `point` to the segment `a`–`b`, clamped to the segment (an endpoint outside does not count). */
export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSquared = abx * abx + aby * aby;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }
  const projection = ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSquared;
  const t = Math.min(1, Math.max(0, projection));
  return Math.hypot(point.x - (a.x + t * abx), point.y - (a.y + t * aby));
}

/** The midpoint of edge `index`, the point on the edge furthest from both of its vertices. */
export function edgeMidpoint(points: readonly Point[], index: number): Point {
  const a = points[index];
  const b = edgeEnd(points, index);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Orientation of the triangle (a, b, c): > 0 counter-clockwise, < 0 clockwise, 0 collinear. */
export function cross(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** A proper crossing: the segments meet in the interior of both. Touching is left to the distance test. */
export function properlyCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const abc = cross(a, b, c);
  const abd = cross(a, b, d);
  const cda = cross(c, d, a);
  const cdb = cross(c, d, b);
  return ((abc > 0 && abd < 0) || (abc < 0 && abd > 0)) && ((cda > 0 && cdb < 0) || (cda < 0 && cdb > 0));
}

/**
 * Twice the signed area (shoelace, D4) relative to the first vertex: the sign is the orientation of the outline
 * and stays correct far from the origin because the coordinates are made relative to `points[0]`. `0` for fewer
 * than 3 points and for an outline without area (all vertices collinear).
 */
export function twiceSignedArea(points: readonly Point[]): number {
  if (points.length < 3) {
    return 0;
  }

  const origin = points[0];
  let twiceArea = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = edgeEnd(points, i);
    twiceArea += (a.x - origin.x) * (b.y - origin.y) - (b.x - origin.x) * (a.y - origin.y);
  }
  return twiceArea;
}
