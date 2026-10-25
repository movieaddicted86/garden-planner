import type { Point, ZoneType } from '@garden-planner/shared';
import { worldToScreen, type Viewport } from '../plan/viewport.js';
import { zoneColor } from '../plan/zone-style.js';

/** Handle radius of a draft vertex, in CSS pixels: big enough to hit, small enough to see the corner it marks. */
export const DRAFT_HANDLE_RADIUS_PX = 4;

/** The props of the draft layer: the corners clicked so far and the type they will become. */
export interface DraftZoneLayerProps {
  readonly type: ZoneType;
  readonly points: readonly Point[];
  readonly viewport: Viewport;
}

/**
 * The draft while the user clicks corners: a dashed polyline through the clicked points with a handle at every
 * vertex, so it is clear which corners are set and where the next click goes. It is drawn above the finished
 * zones and in the colour of the type the zone will get.
 *
 * The polyline connects the points in click order and is **not** closed: the closing edge is the one the user has
 * not drawn yet, and showing it would suggest the outline is finished. A single click has no line at all, which is
 * why the handles are drawn separately from the polyline rather than on top of it.
 */
export function DraftZoneLayer({ type, points, viewport }: DraftZoneLayerProps) {
  const screen = points.map((point) => worldToScreen(viewport, point));
  const color = zoneColor(type);

  return (
    <g className="plan-draft" data-testid="zone-draft" data-type={type} data-point-count={points.length}>
      {screen.length > 1 && (
        <polyline className="plan-draft-line" points={screen.map((point) => `${point.x},${point.y}`).join(' ')} style={{ stroke: color }} />
      )}
      {screen.map((point, index) => (
        // the index is the identity of a corner while it is being drawn: it has no id and no name yet
        <circle key={index} className="plan-draft-handle" cx={point.x} cy={point.y} r={DRAFT_HANDLE_RADIUS_PX} style={{ fill: color }} />
      ))}
    </g>
  );
}
