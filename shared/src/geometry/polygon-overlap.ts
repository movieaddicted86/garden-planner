import { assertFinitePoints } from './assert-finite-points.js';
import { pointInPolygon } from './point-in-polygon.js';
import { edgeEnd, edgeMidpoint, properlyCross, twiceSignedArea } from './polygon-primitives.js';
import type { Point } from './point.js';

/**
 * How far an edge midpoint is pushed towards the interior before it is tested against the other polygon, in
 * metres. It has to clear `GEOMETRY_EPSILON` (1e-9 m) or the probe would sit on the outline and be answered
 * `'boundary'`, and it has to stay far below any overlap a user can draw: a sliver narrower than this is the
 * known blind spot noted on `polygonsOverlap`.
 */
const INWARD_PROBE_OFFSET = 1e-6;

/** `true` when some edge of `a` properly crosses an edge of `b`: the two interiors meet in a single point. */
function edgesProperlyCross(a: readonly Point[], b: readonly Point[]): boolean {
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      if (properlyCross(a[i], edgeEnd(a, i), b[j], edgeEnd(b, j))) {
        return true;
      }
    }
  }
  return false;
}

/** `true` when any vertex of `a` is strictly inside `b`: the polygon is swallowed or overlaps from a corner. */
function hasVertexInside(a: readonly Point[], b: readonly Point[]): boolean {
  return a.some((vertex) => pointInPolygon(vertex, b) === 'inside');
}

/**
 * The midpoint of edge `index` of `polygon`, moved `INWARD_PROBE_OFFSET` towards the interior. Which way is
 * inward follows from the orientation: the shoelace sum is positive for a counter-clockwise outline, whose
 * interior lies to the left of every edge, so the left normal `(-dy, dx)` of the edge direction points inside;
 * a negative sum flips it. The direction is normalised, so a long and a short edge move by the same distance.
 * An edge of zero length (a duplicate vertex, D5) has no direction and its midpoint is returned unchanged.
 */
function inwardProbePoint(polygon: readonly Point[], index: number): Point {
  const a = polygon[index];
  const b = edgeEnd(polygon, index);
  const midpoint = edgeMidpoint(polygon, index);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return midpoint;
  }
  const orientation = twiceSignedArea(polygon) >= 0 ? 1 : -1;
  return {
    x: midpoint.x + (INWARD_PROBE_OFFSET * -dy * orientation) / length,
    y: midpoint.y + (INWARD_PROBE_OFFSET * dx * orientation) / length,
  };
}

/**
 * `true` when the two polygons share interior area, `false` when they are apart or merely touch along an edge or
 * a corner (D6). Touching is not overlapping: two patio zones that share a border are laid next to each other,
 * and only a real overlap doubles the material. Only the strict answer `'inside'` counts anywhere here, which is
 * what keeps a shared border out.
 *
 * Three probes, any of which is enough:
 * 1. two edges properly cross — the interiors meet, whatever the shapes look like otherwise;
 * 2. a vertex of one polygon lies strictly inside the other — covers a polygon contained in the other and the
 *    case where only a corner of one reaches into the other;
 * 3. the midpoint of an edge, moved `INWARD_PROBE_OFFSET` towards its own interior, lies strictly inside the
 *    other — the case no vertex finds: identical polygons, and polygons that share all their edges.
 *
 * The probes are run in both directions, so the answer does not depend on the argument order.
 *
 * Known limitation: an overlap narrower than roughly `INWARD_PROBE_OFFSET` (1e-6 m) can be missed. Such a sliver
 * is finer than any drawing or input can express (D1: metres, D2: 2 decimals), and the two zones then count as
 * touching, which is the harmless direction of the error — a warning too few, never one too many.
 *
 * Self-intersecting outlines (D5) are not judged: they get the even-odd interior of `pointInPolygon` and the
 * function does not throw. Non-finite coordinates → `RangeError`.
 */
export function polygonsOverlap(a: readonly Point[], b: readonly Point[]): boolean {
  assertFinitePoints(a, 'polygonsOverlap');
  assertFinitePoints(b, 'polygonsOverlap');

  if (edgesProperlyCross(a, b)) {
    return true;
  }
  if (hasVertexInside(a, b) || hasVertexInside(b, a)) {
    return true;
  }
  return (
    a.some((_vertex, index) => pointInPolygon(inwardProbePoint(a, index), b) === 'inside') ||
    b.some((_vertex, index) => pointInPolygon(inwardProbePoint(b, index), a) === 'inside')
  );
}

/** `true` when `point` counts as inside or on the outline of `polygon` (the containment rule tolerates the edge). */
function isInsideOrOnBoundary(point: Point, polygon: readonly Point[]): boolean {
  return pointInPolygon(point, polygon) !== 'outside';
}

/**
 * `true` when `inner` lies entirely in `outer`, the outline included: a zone drawn exactly on the border of the
 * base area is inside it, not "leaving" it (D6). Three conditions, all of them required:
 *
 * 1. no edge of `inner` properly crosses an edge of `outer` — an outline that stays on one side everywhere
 *    cannot poke out;
 * 2. every vertex of `inner` is `'inside'` or `'boundary'` of `outer`;
 * 3. every edge midpoint of `inner` is `'inside'` or `'boundary'` of `outer` — the reason the two other
 *    conditions are not enough: `outer` may be concave, so an edge can leave the shape between two vertices
 *    that both lie inside without crossing the outline transversally (a chord across a notch).
 *
 * Equal polygons are inside each other: every condition holds with `'boundary'` answers. Self-intersecting
 * outlines (D5) are not judged (a stable answer, no throw); non-finite coordinates → `RangeError`.
 */
export function isPolygonInside(inner: readonly Point[], outer: readonly Point[]): boolean {
  assertFinitePoints(inner, 'isPolygonInside');
  assertFinitePoints(outer, 'isPolygonInside');

  if (edgesProperlyCross(inner, outer)) {
    return false;
  }
  if (!inner.every((vertex) => isInsideOrOnBoundary(vertex, outer))) {
    return false;
  }
  return inner.every((_vertex, index) => isInsideOrOnBoundary(edgeMidpoint(inner, index), outer));
}
