import type { Point } from '@garden-planner/shared';

/**
 * The window from plan coordinates (metres, x right, y down, D1) into screen coordinates (CSS pixels, origin
 * top-left). `scale` is pixels per metre, `originX`/`originY` is the world point shown at screen `(0, 0)`.
 * Everything here is pure: the store replaces the object, the renderer only reads it.
 */
export interface Viewport {
  readonly scale: number;
  readonly originX: number;
  readonly originY: number;
}

/** A screen size in CSS pixels; the canvas the plan is drawn into. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** An axis-aligned world rectangle in metres. `boundsOf` builds it, `fitToRect` consumes it. */
export interface Rect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Zoom limits in pixels per metre: below `MIN_SCALE` a whole garden is a dot, above `MAX_SCALE` a single grid
 * cell fills the screen. The clamp is what keeps `zoomAt` inside a usable range instead of returning a viewport
 * the user cannot get out of.
 */
export const MIN_SCALE = 10;
export const MAX_SCALE = 500;

/**
 * A coordinate crossing this boundary has to be finite: a `NaN` scale or origin does not throw, it silently
 * propagates into every later draw and into the zoom maths, where it is much harder to trace back.
 */
function assertFinitePoint(point: Point, caller: string, what: string): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError(`${caller}: ${what} has a non-finite coordinate (${point.x}, ${point.y})`);
  }
}

/** The vertex-wise variant for `boundsOf`, indexed so a caller can find the bad point (as in `shared/`). */
function assertFinitePoints(points: readonly Point[], caller: string): void {
  for (let i = 0; i < points.length; i += 1) {
    const { x, y } = points[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new RangeError(`${caller}: vertex ${i} has a non-finite coordinate (${x}, ${y})`);
    }
  }
}

/** `scale` limited to the range the plan may be drawn in. */
function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** The screen pixel of a world point (metres). */
export function worldToScreen(viewport: Viewport, point: Point): Point {
  assertFinitePoint(point, 'worldToScreen', 'point');
  return {
    x: (point.x - viewport.originX) * viewport.scale,
    y: (point.y - viewport.originY) * viewport.scale,
  };
}

/** The world point (metres) drawn at a screen pixel. */
export function screenToWorld(viewport: Viewport, point: Point): Point {
  assertFinitePoint(point, 'screenToWorld', 'point');
  return {
    x: viewport.originX + point.x / viewport.scale,
    y: viewport.originY + point.y / viewport.scale,
  };
}

/**
 * Zooms by `factor` around a screen point: the world point under `screenPoint` stays under it, which is what a
 * wheel or pinch gesture does. The factor is a ratio (2 = twice as large), never an absolute scale.
 */
export function zoomAt(viewport: Viewport, screenPoint: Point, factor: number): Viewport {
  assertFinitePoint(screenPoint, 'zoomAt', 'screenPoint');
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new RangeError(`zoomAt: factor must be finite and greater than 0, got ${factor}`);
  }

  const anchor = screenToWorld(viewport, screenPoint);
  const scale = clampScale(viewport.scale * factor);
  return {
    scale,
    originX: anchor.x - screenPoint.x / scale,
    originY: anchor.y - screenPoint.y / scale,
  };
}

/**
 * Moves the content by a screen delta. Dragging right by `dxPx` moves the content right, so the world point at
 * the screen origin moves left: `originX` decreases.
 */
export function panBy(viewport: Viewport, dxPx: number, dyPx: number): Viewport {
  if (!Number.isFinite(dxPx) || !Number.isFinite(dyPx)) {
    throw new RangeError(`panBy: delta must be finite, got (${dxPx}, ${dyPx})`);
  }
  return {
    scale: viewport.scale,
    originX: viewport.originX - dxPx / viewport.scale,
    originY: viewport.originY - dyPx / viewport.scale,
  };
}

/** The smallest rectangle (metres) containing every point. An empty list has no bounds, not an empty one. */
export function boundsOf(points: readonly Point[]): Rect {
  if (points.length === 0) {
    throw new RangeError('boundsOf: needs at least one point');
  }
  assertFinitePoints(points, 'boundsOf');

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = minX;
  let maxY = minY;
  for (const { x, y } of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * The viewport that shows `rect` as large as possible with `marginPx` free on every side, the rectangle's centre
 * on the screen centre. The result is clamped, so a rect of zero width (one point, or a vertical line) lands on
 * `MAX_SCALE` and a huge one on `MIN_SCALE` — a viewport the user can still work with, instead of an infinity.
 */
export function fitToRect(rect: Rect, size: Size, marginPx: number): Viewport {
  const width = rect.maxX - rect.minX;
  const height = rect.maxY - rect.minY;
  const scale = clampScale(Math.min((size.width - 2 * marginPx) / width, (size.height - 2 * marginPx) / height));

  return {
    scale,
    originX: (rect.minX + rect.maxX) / 2 - size.width / 2 / scale,
    originY: (rect.minY + rect.maxY) / 2 - size.height / 2 / scale,
  };
}
