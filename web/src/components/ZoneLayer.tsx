import { isValidPolygon, type Zone } from '@garden-planner/shared';
import { boundsOf, worldToScreen, type Viewport } from '../plan/viewport.js';
import { zoneColor } from '../plan/zone-style.js';

/** The class of a zone outline; a selected zone gets the additional class below. */
const ZONE_CLASS = 'plan-zone';

/** Added to the outline of the selected zone, so the list's selection is visible on the plan. */
const SELECTED_CLASS = 'plan-zone-selected';

/** The font size of a zone's name in the plan, in CSS pixels. */
const LABEL_FONT_PX = 12;

/** The props of the zone layer: the zones to draw, the window to draw them in and which one is selected. */
export interface ZoneLayerProps {
  readonly zones: readonly Zone[];
  readonly viewport: Viewport;
  readonly selectedZoneId: string | null;
}

/** The `points` attribute of a polygon in screen coordinates (CSS pixels, as the base area uses). */
function screenPoints(viewport: Viewport, points: readonly { x: number; y: number }[]): string {
  return points
    .map((point) => {
      const screen = worldToScreen(viewport, point);
      return `${screen.x},${screen.y}`;
    })
    .join(' ');
}

/**
 * The zones on the plan: one `<polygon>` per zone in its type colour, with the zone name at the centre of the
 * zone's bounding box. A zone that crosses itself (D5) carries `data-invalid` and is drawn as a red dashed
 * outline, so the error is visible where the zone is and not only in the list.
 *
 * `isValidPolygon` is `shared/`'s rule, called here rather than re-implemented: the plan and the list have to
 * reach the same verdict about the same zone. Everything is converted with `worldToScreen`, so zones, base area
 * and grid share one coordinate maths and the SVG keeps one user unit per CSS pixel.
 */
export function ZoneLayer({ zones, viewport, selectedZoneId }: ZoneLayerProps) {
  return (
    <g>
      {zones.map((zone) => {
        const bounds = boundsOf(zone.points);
        const centre = worldToScreen(viewport, { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 });
        const invalid = !isValidPolygon(zone.points);
        const selected = zone.id === selectedZoneId;
        const color = zoneColor(zone.type);
        return (
          <g key={zone.id}>
            <polygon
              className={selected ? `${ZONE_CLASS} ${SELECTED_CLASS}` : ZONE_CLASS}
              data-testid="zone-polygon"
              data-zone-id={zone.id}
              {...(invalid ? { 'data-invalid': 'true' } : {})}
              {...(selected ? { 'data-selected': 'true' } : {})}
              points={screenPoints(viewport, zone.points)}
              style={{ fill: color, stroke: color }}
            />
            {/* the name is not a measurement: it is drawn in the text colour, in a plain font size (no zoom) */}
            <text
              className="plan-zone-label"
              data-testid="zone-label"
              x={centre.x}
              y={centre.y}
              fontSize={LABEL_FONT_PX}
              textAnchor="middle"
            >
              {zone.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}
