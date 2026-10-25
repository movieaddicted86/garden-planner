import { assertFinitePoints } from './assert-finite-points.js';
import { twiceSignedArea } from './polygon-primitives.js';
import type { Point } from './point.js';

/**
 * Area of the polygon in m² (shoelace, D4): always >= 0, the same for clockwise and counter-clockwise input (D3).
 * Coordinates are made relative to the first vertex so a plot far from the origin does not lose precision.
 */
export function polygonArea(points: readonly Point[]): number {
  assertFinitePoints(points, 'polygonArea');
  return Math.abs(twiceSignedArea(points)) / 2;
}
