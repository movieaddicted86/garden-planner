import type { Point } from './point.js';

/**
 * Guards the geometry entry points against coordinates that would silently turn every result into `NaN`.
 * `functionName` is the name of the caller, so the message stays as specific as the one `polygonArea` threw
 * from T-001 (the vertex index is what a caller needs to find the bad point).
 */
export function assertFinitePoints(points: readonly Point[], functionName: string): void {
  for (let i = 0; i < points.length; i += 1) {
    const { x, y } = points[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new RangeError(`${functionName}: vertex ${i} has a non-finite coordinate (${x}, ${y})`);
    }
  }
}
