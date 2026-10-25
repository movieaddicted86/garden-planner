import { useRef } from 'react';
import { usePlanStore } from '../state/use-plan-store.js';
import { worldToScreen } from '../plan/viewport.js';
import { usePlanInteraction } from '../hooks/usePlanInteraction.js';
import { PlanGrid } from './PlanGrid.js';
import { PlanScaleBar } from './PlanScaleBar.js';
import { ZoneLayer } from './ZoneLayer.js';
import { DraftZoneLayer } from './DraftZoneLayer.js';

/** The decimals `data-scale` reports; the attribute is read by the E2E spec, which needs a stable string. */
const SCALE_ATTRIBUTE_DECIMALS = 3;

/** The plan canvas: the base area and the zones on the metre grid, with the gestures that move the viewport. */
export function PlanView() {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewport = usePlanStore((state) => state.viewport);
  const size = usePlanStore((state) => state.canvasSize);
  const baseArea = usePlanStore((state) => state.project.baseArea);
  const zones = usePlanStore((state) => state.project.zones);
  const drawing = usePlanStore((state) => state.drawing);
  const selectedZoneId = usePlanStore((state) => state.selectedZoneId);
  // read as a primitive, so a unit switch re-renders this component, but a store write to anything else does not
  const displayUnit = usePlanStore((state) => state.project.displayUnit);

  usePlanInteraction(svgRef);

  // A canvas that has not been measured yet has no room to fit the plan into: drawing the placeholder viewport
  // would put the base area at an arbitrary place for one frame. The first `setCanvasSize` fits it (T-007).
  const measured = size.width > 0 && size.height > 0;

  return (
    <svg
      ref={svgRef}
      className="plan-svg"
      data-testid="plan-svg"
      role="img"
      aria-label="Garden plan"
      data-scale={viewport.scale.toFixed(SCALE_ATTRIBUTE_DECIMALS)}
      // the drawing keys are read off this element: without a tab stop the SVG never receives the focus at all
      tabIndex={0}
    >
      {measured && (
        <>
          <PlanGrid viewport={viewport} size={size} />
          <polygon
            className="plan-base-area"
            data-testid="base-area"
            points={baseArea.points
              .map((point) => {
                const screen = worldToScreen(viewport, point);
                return `${screen.x},${screen.y}`;
              })
              .join(' ')}
          />
          <ZoneLayer zones={zones} viewport={viewport} selectedZoneId={selectedZoneId} />
          {/* above the zones: the outline being drawn must stay readable over the finished ones */}
          {drawing && <DraftZoneLayer type={drawing.type} points={drawing.points} viewport={viewport} />}
          <PlanScaleBar viewport={viewport} size={size} unit={displayUnit} />
        </>
      )}
    </svg>
  );
}
