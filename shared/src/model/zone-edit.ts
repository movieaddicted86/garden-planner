import { assertFinitePoint } from '../geometry/assert-finite-points.js';
import { edgeMidpoint } from '../geometry/polygon-primitives.js';
import type { Point } from '../geometry/point.js';
import { MIN_VERTICES } from './factories.js';
import type { Zone } from './project.js';

/**
 * The editing primitives the zone editor calls: move a vertex, insert one on an edge, remove one, toggle an
 * edge's edging. Every function returns a **new** `Zone` and keeps `points` and `edging` in step (D10) — the
 * result always has `edging.length === points.length`. Vertices are treated as immutable values (D11): a vertex
 * an operation does not touch is shared with the input zone, the two arrays never are, so the caller can keep the
 * old zone as a previous state.
 *
 * None of the operations judges the shape. Self-intersection is `validatePolygon`'s job (D5), and an editor has
 * to be able to pass through a temporarily invalid polygon instead of refusing the user's drag.
 */

/** A new zone with the given points and edging: the one place the two arrays are swapped together (D10). */
function withGeometry(zone: Zone, points: readonly Point[], edging: readonly boolean[]): Zone {
  return { ...zone, points, edging };
}

/** A vertex copy, so a caller keeping a mutable alias of `to` cannot move a vertex afterwards. */
function copyVertex(point: Point): Point {
  return { x: point.x, y: point.y };
}

/**
 * A vertex or edge index of a polygon with `count` of them (D4): an integer in `0..count - 1`. `Number.isInteger`
 * rejects `1.5`, `NaN` and the infinities in one go; `count` is never 0 for a zone (D3).
 */
function assertIndex(index: number, count: number, caller: string, what: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError(`${caller}: ${what} ${index} is not an integer in 0..${count - 1}`);
  }
}

/** The zone with vertex `index` at `to`; the edging is untouched. Bad index or non-finite `to` → `RangeError`. */
export function moveVertex(zone: Zone, index: number, to: Point): Zone {
  assertIndex(index, zone.points.length, 'moveVertex', 'vertex index');
  assertFinitePoint(to, 'moveVertex', 'the target point');
  const points = zone.points.map((point, i) => (i === index ? copyVertex(to) : point));
  return withGeometry(zone, points, [...zone.edging]);
}

/**
 * The zone with a vertex inserted on edge `index` (D4): the new vertex gets index `edgeIndex + 1`, and for the
 * closing edge `n - 1` it is appended at the end. `at` defaults to the midpoint of the edge. The edge is split
 * and both halves inherit its flag (D10), so `edging[edgeIndex]` is inserted at `edgeIndex + 1`. Bad index or
 * non-finite `at` → `RangeError`.
 */
export function insertVertex(zone: Zone, edgeIndex: number, at?: Point): Zone {
  assertIndex(edgeIndex, zone.points.length, 'insertVertex', 'edge index');
  const point = at ?? edgeMidpoint(zone.points, edgeIndex);
  assertFinitePoint(point, 'insertVertex', 'the new point');

  const insertAt = edgeIndex + 1;
  const points = [...zone.points.slice(0, insertAt), copyVertex(point), ...zone.points.slice(insertAt)];
  const edging = [...zone.edging.slice(0, insertAt), zone.edging[edgeIndex], ...zone.edging.slice(insertAt)];
  return withGeometry(zone, points, edging);
}

/**
 * The zone without vertex `index`. Its two edges are merged, and the merged edge keeps the flag of the first of
 * them in cyclic order (D10). Dropping `edging[index]` implements exactly that: the merged edge lands on slot
 * `index - 1` of the shorter list, which held the earlier of the two flags — for `index === 0` the pair is the
 * closing edge `n - 1` and edge 0, and the merged edge takes slot `n - 2` with the closing edge's flag. A zone
 * with `MIN_VERTICES` (D3) cannot lose one → `RangeError`. Bad index → `RangeError`.
 */
export function removeVertex(zone: Zone, index: number): Zone {
  assertIndex(index, zone.points.length, 'removeVertex', 'vertex index');
  if (zone.points.length <= MIN_VERTICES) {
    throw new RangeError(`removeVertex: a zone keeps at least ${MIN_VERTICES} vertices, has ${zone.points.length}`);
  }
  // Dropping the entry at the same index from both arrays is the whole rule: the merged edge lands on slot
  // `index - 1` in the shorter list, which is where the *first* of the two flags used to sit.
  return withGeometry(
    zone,
    [...zone.points.slice(0, index), ...zone.points.slice(index + 1)],
    [...zone.edging.slice(0, index), ...zone.edging.slice(index + 1)],
  );
}

/** The zone with the edging flag of edge `index` inverted; the geometry is untouched. Bad index → `RangeError`. */
export function toggleEdge(zone: Zone, edgeIndex: number): Zone {
  assertIndex(edgeIndex, zone.edging.length, 'toggleEdge', 'edge index');
  return withGeometry(
    zone,
    [...zone.points],
    zone.edging.map((flag, i) => (i === edgeIndex ? !flag : flag)),
  );
}
