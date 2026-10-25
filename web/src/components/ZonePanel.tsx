import { useState } from 'react';
import type { ZoneType } from '@garden-planner/shared';
import { usePlanStore } from '../state/use-plan-store.js';
import { ZoneDrawControls } from './ZoneDrawControls.js';
import { ZoneItem } from './ZoneItem.js';
import { ZoneWarnings } from './ZoneWarnings.js';

/**
 * The zone panel: the drawing controls and the list of the zones on the plan, with their live figures, the
 * validity badge and the warnings (D5, D6, D7).
 *
 * The zone type is the panel's own state and not the store's: it is what the user is about to draw, not something
 * that belongs to the plan, and nothing else needs to read it. `startDrawing` receives it when "Draw zone" is
 * pressed, which is also when the draft appears.
 */
export function ZonePanel() {
  const project = usePlanStore((state) => state.project);
  const drawing = usePlanStore((state) => state.drawing);
  const selectedZoneId = usePlanStore((state) => state.selectedZoneId);
  const startDrawing = usePlanStore((state) => state.startDrawing);
  const finishDrawing = usePlanStore((state) => state.finishDrawing);
  const cancelDrawing = usePlanStore((state) => state.cancelDrawing);
  const selectZone = usePlanStore((state) => state.selectZone);
  const deleteZone = usePlanStore((state) => state.deleteZone);

  const [type, setType] = useState<ZoneType>('bed');

  return (
    <section className="zone-panel" aria-labelledby="zone-heading">
      <h2 className="zone-heading" id="zone-heading">
        Zones
      </h2>

      <ZoneDrawControls
        type={type}
        pointCount={drawing?.points.length ?? null}
        onTypeChange={setType}
        onStart={() => startDrawing(type)}
        onFinish={finishDrawing}
        onCancel={cancelDrawing}
      />

      <ul className="zone-list" data-testid="zone-list">
        {project.zones.map((zone) => (
          <ZoneItem
            key={zone.id}
            zone={zone}
            unit={project.displayUnit}
            selected={zone.id === selectedZoneId}
            onSelect={() => selectZone(zone.id)}
            onDelete={() => deleteZone(zone.id)}
          />
        ))}
      </ul>

      <ZoneWarnings project={project} />
    </section>
  );
}
