import { ZONE_TYPES, type ZoneType } from '@garden-planner/shared';
import { zoneTypeLabel } from '../plan/zone-style.js';

/** The props of the drawing controls: the type picked, the draft in progress and what the buttons do. */
export interface ZoneDrawControlsProps {
  readonly type: ZoneType;
  readonly pointCount: number | null;
  readonly onTypeChange: (type: ZoneType) => void;
  readonly onStart: () => void;
  readonly onFinish: () => void;
  readonly onCancel: () => void;
}

/**
 * The drawing controls of the zone panel: the type select and either the "Draw zone" button or, while a draft is
 * running, the instruction, the point count and the Finish/Cancel pair.
 *
 * Presentational — it holds no state and reads no store; the panel above owns both, so the controls can be
 * reasoned about (and later reused) without the store.
 */
export function ZoneDrawControls({ type, pointCount, onTypeChange, onStart, onFinish, onCancel }: ZoneDrawControlsProps) {
  const drawing = pointCount !== null;
  return (
    <div className="zone-draw">
      <label className="zone-type-label" htmlFor="zone-type">
        Zone type
      </label>
      <select
        id="zone-type"
        data-testid="zone-type"
        className="zone-type-select"
        value={type}
        onChange={(event) => onTypeChange(event.target.value as ZoneType)}
      >
        {ZONE_TYPES.map((option) => (
          <option key={option} value={option}>
            {zoneTypeLabel(option)}
          </option>
        ))}
      </select>

      {drawing ? (
        <>
          <p className="zone-draw-hint" data-testid="zone-draw-hint">
            Click the corners on the plan, then Finish.
          </p>
          <div className="zone-draw-buttons">
            {/* disabled below three corners: a polygon needs at least three (D3) */}
            <button type="button" className="zone-button" data-testid="zone-finish" disabled={pointCount < 3} onClick={onFinish}>
              Finish
            </button>
            <button type="button" className="zone-button zone-button-secondary" data-testid="zone-cancel" onClick={onCancel}>
              Cancel
            </button>
            <span className="zone-point-count" data-testid="zone-point-count">
              {pointCount} {pointCount === 1 ? 'point' : 'points'}
            </span>
          </div>
        </>
      ) : (
        <button type="button" className="zone-button" data-testid="zone-start" onClick={onStart}>
          Draw zone
        </button>
      )}
    </div>
  );
}
