import { gridLines, niceGridStep } from '../plan/grid.js';
import { worldToScreen, type Size, type Viewport } from '../plan/viewport.js';

/** The class of a grid line; the colour comes from `styles.css`, not from here. */
const GRID_LINE_CLASS = 'plan-grid-line';

/** The props of the grid: the window into the plan and the canvas it is drawn on. */
export interface PlanGridProps {
  readonly viewport: Viewport;
  readonly size: Size;
}

/**
 * The metre grid behind the plan. Every line is converted with `worldToScreen` and drawn as an absolute
 * rectangle in screen pixels — no SVG `transform` and no `viewBox` scaling, so a line stays exactly 1 px wide at
 * every zoom level and the same maths that places the plan places the grid.
 */
export function PlanGrid({ viewport, size }: PlanGridProps) {
  const { xs, ys } = gridLines(viewport, size, niceGridStep(viewport.scale));

  return (
    <g>
      {xs.map((x) => {
        const from = worldToScreen(viewport, { x, y: viewport.originY });
        return <line key={`x-${x}`} className={GRID_LINE_CLASS} x1={from.x} y1={0} x2={from.x} y2={size.height} />;
      })}
      {ys.map((y) => {
        const from = worldToScreen(viewport, { x: viewport.originX, y });
        return <line key={`y-${y}`} className={GRID_LINE_CLASS} x1={0} y1={from.y} x2={size.width} y2={from.y} />;
      })}
    </g>
  );
}
