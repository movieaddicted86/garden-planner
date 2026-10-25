import { formatLength } from '@garden-planner/shared';
import { scaleBar } from '../plan/grid.js';
import type { Size, Viewport } from '../plan/viewport.js';

/** Free space the bar keeps from the bottom-left corner of the plan, in CSS pixels. */
const BAR_MARGIN_PX = 16;

/** Half-length of the tick that closes each end of the bar, in CSS pixels. */
const BAR_TICK_HALF_PX = 4;

/** Distance from the bar up to its label, in CSS pixels. */
const BAR_LABEL_GAP_PX = 6;

/** The props of the scale bar: the zoom it has to describe and the canvas it sits on. */
export interface PlanScaleBarProps {
  readonly viewport: Viewport;
  readonly size: Size;
}

/**
 * The scale bar: the longest bar from `SCALE_BAR_STEPS` that still fits in the pixel budget, drawn at its real
 * length with the length it stands for written above it. The label is `formatLength` of that length in metres
 * (D2), so the bar and the number can never disagree — the number is derived from the pixels, not passed in.
 * The bar sits in the bottom-left corner of the canvas, where it stays put while zooming and panning.
 */
export function PlanScaleBar({ viewport, size }: PlanScaleBarProps) {
  const bar = scaleBar(viewport.scale);
  const left = BAR_MARGIN_PX;
  const right = left + bar.pixels;
  const y = size.height - BAR_MARGIN_PX;

  return (
    <g>
      <line className="plan-scale-bar" data-testid="scale-bar" x1={left} y1={y} x2={right} y2={y} />
      {/* the tick marks close the bar off, so its ends are readable against the grid */}
      <line className="plan-scale-bar" x1={left} y1={y - BAR_TICK_HALF_PX} x2={left} y2={y + BAR_TICK_HALF_PX} />
      <line className="plan-scale-bar" x1={right} y1={y - BAR_TICK_HALF_PX} x2={right} y2={y + BAR_TICK_HALF_PX} />
      <text className="plan-scale-bar-label" data-testid="scale-bar-label" x={left} y={y - BAR_LABEL_GAP_PX}>
        {formatLength(bar.meters, 'm')}
      </text>
    </g>
  );
}
