import type { Size, Viewport } from './viewport.js';

/** The step sizes the grid may use, in metres, ascending. */
const GRID_STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100] as const;

/** A cell narrower than this many pixels is noise, not a grid — it is the whole reason for choosing a step. */
const MIN_GRID_PIXELS = 24;

/** The precision grid values carry: at 10 decimals `k * step` stops showing `0.30000000000000004`. */
const GRID_DECIMALS = 10;

/** The bar lengths the scale bar may show, in metres, ascending. */
const SCALE_BAR_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100] as const;

/** The widest a scale bar is drawn, in CSS pixels. */
const MAX_SCALE_BAR_PIXELS = 150;

/** The straight lines of the grid inside the visible rectangle, in world coordinates (metres). */
export interface GridLines {
  readonly xs: number[];
  readonly ys: number[];
}

/** A labelled bar of `meters` world metres, `pixels` long on screen. */
export interface ScaleBar {
  readonly meters: number;
  readonly pixels: number;
}

/** Rounds to the precision grid values are reported in, so a ratio of two such values compares as a whole one. */
function roundGridValue(value: number): number {
  return Number(value.toFixed(GRID_DECIMALS));
}

/**
 * The multiples of `step` inside `[min, max]`, ascending. The bounds are divided by the step before rounding,
 * so a line exactly on the edge of the viewport is kept: `3 / 0.1` is `29.999999999999996` in binary floating
 * point and would otherwise drop the line at 3 m.
 */
function multiplesIn(min: number, max: number, step: number): number[] {
  const first = Math.ceil(roundGridValue(min / step));
  const last = Math.floor(roundGridValue(max / step));

  const values: number[] = [];
  for (let k = first; k <= last; k += 1) {
    values.push(roundGridValue(k * step));
  }
  return values;
}

/**
 * The smallest step of `GRID_STEPS` whose cells are at least `MIN_GRID_PIXELS` wide at this scale, in metres.
 * `scale` above `MAX_SCALE` still gets the finest step: at the finest step a cell is already 50 px there, and no
 * candidate is smaller than the smallest.
 */
export function niceGridStep(scale: number): number {
  return GRID_STEPS.find((step) => step * scale >= MIN_GRID_PIXELS) ?? GRID_STEPS[GRID_STEPS.length - 1];
}

/** The grid lines of `step` metres inside the visible world rectangle of `viewport`, in world coordinates. */
export function gridLines(viewport: Viewport, size: Size, step: number): GridLines {
  if (!Number.isFinite(step) || step <= 0) {
    throw new RangeError(`gridLines: step must be finite and greater than 0, got ${step}`);
  }

  const minX = viewport.originX;
  const minY = viewport.originY;
  return {
    xs: multiplesIn(minX, minX + size.width / viewport.scale, step),
    ys: multiplesIn(minY, minY + size.height / viewport.scale, step),
  };
}

/**
 * The longest bar of `SCALE_BAR_STEPS` that is still at most `MAX_SCALE_BAR_PIXELS` wide, with its pixel length.
 * The candidates stop at 100 m, so a bar never claims more than a garden.
 */
export function scaleBar(scale: number): ScaleBar {
  let meters: number = SCALE_BAR_STEPS[0];
  for (const step of SCALE_BAR_STEPS) {
    if (step * scale <= MAX_SCALE_BAR_PIXELS) {
      meters = step;
    }
  }
  return { meters, pixels: meters * scale };
}
