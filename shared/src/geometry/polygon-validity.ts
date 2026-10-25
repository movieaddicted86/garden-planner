import { assertFinitePoints } from './assert-finite-points.js';
import { distanceToSegment, edgeEnd, GEOMETRY_EPSILON, properlyCross } from './polygon-primitives.js';
import type { Point } from './point.js';

/** Why a polygon cannot be used (D5). `edgeA < edgeB`, edges numbered as in D4. */
export type PolygonIssue =
  | { kind: 'too_few_points' }
  | { kind: 'duplicate_vertex'; index: number } // vertex `index` is within GEOMETRY_EPSILON of vertex `(index + 1) mod n`: edge `index` has no length
  | { kind: 'self_intersection'; edgeA: number; edgeB: number };

/** The two edges are neighbours: `j === i + 1`, or `i === 0` and `j === n - 1` (the closing edge). */
function isAdjacent(edgeA: number, edgeB: number, vertexCount: number): boolean {
  return edgeB === edgeA + 1 || (edgeA === 0 && edgeB === vertexCount - 1);
}

/**
 * Distance between the segments `a`–`b` and `c`–`d`: 0 when they properly cross, otherwise the smallest
 * endpoint-to-segment distance. That is 0 for a vertex lying on the other segment (T-junction), for two edges
 * meeting in a shared vertex and for a collinear overlap, and > 0 for shapes that stay apart.
 */
function segmentDistance(a: Point, b: Point, c: Point, d: Point): number {
  if (properlyCross(a, b, c, d)) {
    return 0;
  }
  return Math.min(distanceToSegment(a, c, d), distanceToSegment(b, c, d), distanceToSegment(c, a, b), distanceToSegment(d, a, b));
}

/**
 * Non-adjacent edges are an issue when they come within the tolerance at all. Adjacent edges share a vertex by
 * definition (D5), which is not an issue in itself: they are one only when they fold back onto each other, that
 * is when the far endpoint of one edge lies on the other edge.
 */
function edgesTouch(points: readonly Point[], edgeA: number, edgeB: number): boolean {
  const a = points[edgeA];
  const b = edgeEnd(points, edgeA);
  const c = points[edgeB];
  const d = edgeEnd(points, edgeB);

  if (!isAdjacent(edgeA, edgeB, points.length)) {
    return segmentDistance(a, b, c, d) <= GEOMETRY_EPSILON;
  }

  // `b === c` for neighbours in sequence; for the closing pair (0, n - 1) the shared vertex is `a === d`.
  const inSequence = edgeB === edgeA + 1;
  const farEndOfA = inSequence ? a : b;
  const farEndOfB = inSequence ? d : c;
  return distanceToSegment(farEndOfA, c, d) <= GEOMETRY_EPSILON || distanceToSegment(farEndOfB, a, b) <= GEOMETRY_EPSILON;
}

/**
 * Vertex `i` repeats the next vertex `(i + 1) mod n` (cyclic, so a repeated closing vertex counts) when the two
 * lie within `GEOMETRY_EPSILON` of each other, not only when they are bit-identical. Edge `i` of a polygon drawn
 * with an exactly repeated vertex has no length; one drawn with a vertex a nanometre away has an edge that is
 * shorter than any input can express on purpose. Both are the same defect for the user, and the exact test let
 * the tiny one through: the neighbouring edges then met at a distance below the tolerance and were reported as a
 * `self_intersection` (review of T-003, finding 1).
 */
function isDuplicateVertex(a: Point, b: Point): boolean {
  return Math.hypot(b.x - a.x, b.y - a.y) <= GEOMETRY_EPSILON;
}

/**
 * Every reason the polygon is not a usable zone outline (D3, D5), `[]` when it is fine. Order of evaluation,
 * first match wins:
 *
 * 1. fewer than 3 points — no polygon at all;
 * 2. a duplicate vertex (cyclic, so a repeated closing vertex counts) — only those issues are reported: a ring
 *    typed with a repeated first point has to be fixed before an intersection test says anything useful;
 * 3. otherwise the pairs of edges that touch, ascending by (edge A, edge B).
 *
 * O(n²): a zone has a few dozen vertices, and a spatial index would cost more than it saves.
 */
export function validatePolygon(points: readonly Point[]): PolygonIssue[] {
  assertFinitePoints(points, 'validatePolygon');

  const vertexCount = points.length;
  if (vertexCount < 3) {
    return [{ kind: 'too_few_points' }];
  }

  const duplicates: PolygonIssue[] = [];
  for (let i = 0; i < vertexCount; i += 1) {
    if (isDuplicateVertex(points[i], edgeEnd(points, i))) {
      duplicates.push({ kind: 'duplicate_vertex', index: i });
    }
  }
  if (duplicates.length > 0) {
    return duplicates;
  }

  const issues: PolygonIssue[] = [];
  for (let edgeA = 0; edgeA < vertexCount; edgeA += 1) {
    for (let edgeB = edgeA + 1; edgeB < vertexCount; edgeB += 1) {
      if (edgesTouch(points, edgeA, edgeB)) {
        issues.push({ kind: 'self_intersection', edgeA, edgeB });
      }
    }
  }
  return issues;
}

/** `true` when the polygon can be used as a zone outline: `validatePolygon(points).length === 0`. */
export function isValidPolygon(points: readonly Point[]): boolean {
  return validatePolygon(points).length === 0;
}
