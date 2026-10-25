import {
  addZone,
  createProject,
  createRectangleBaseArea,
  createZone,
  type LengthUnit,
  type Point,
  type Project,
  type ZoneType,
} from '@garden-planner/shared';
import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  boundsOf,
  fitToRect,
  MIN_SCALE,
  panBy as panViewport,
  zoomAt as zoomViewport,
  type Size,
  type Viewport,
} from '../plan/viewport.js';
import { nextZoneName } from '../plan/zone-name.js';

/** Free space the fitted plan keeps around the base area, in CSS pixels. */
const FIT_MARGIN_PX = 40;

/**
 * The viewport before the canvas size is known. It is never a view the user works in — the first
 * `setCanvasSize` fits the plan — so it only has to be a legal, sane viewport rather than the right one.
 */
const DEFAULT_VIEWPORT: Viewport = { scale: MIN_SCALE, originX: 0, originY: 0 };

/** The canvas before it has been measured. A zero size means "not measured yet", not "nothing to draw". */
const UNMEASURED_CANVAS: Size = { width: 0, height: 0 };

/** The draft while the user clicks corners: the type the finished zone gets and the points placed so far (D3). */
export interface ZoneDraft {
  readonly type: ZoneType;
  readonly points: readonly Point[];
}

/** The store state: the project, the two things the plan view needs to draw it (T-008) and the zone editing. */
export interface PlanState {
  readonly project: Project;
  readonly viewport: Viewport;
  readonly canvasSize: Size;
  /** The zone being drawn, or `null` when the plan is not in drawing mode. */
  readonly drawing: ZoneDraft | null;
  /** The zone the user selected, or `null`. Only ever an id that exists in `project.zones`. */
  readonly selectedZoneId: string | null;
  /** Stores the measured canvas size and, on the first measurement, fits the plan into it. */
  setCanvasSize(size: Size): void;
  /** Zooms around a screen point; the world point under it stays under it. */
  zoomAt(screenPoint: Point, factor: number): void;
  /** Moves the content by a screen delta, as a drag does. */
  panBy(dxPx: number, dyPx: number): void;
  /** Shows the whole base area with the fit margin. */
  fitProject(): void;
  /** Switches the unit of display and input (D2); no stored value changes, the numbers are re-read in `unit`. */
  setDisplayUnit(unit: LengthUnit): void;
  /** Replaces the base area with a rectangle of that size in metres and fits it into the canvas. */
  setBaseAreaRectangle(widthMeters: number, heightMeters: number): void;
  /** Enters drawing mode for `type` with no point placed yet. A running draft is dropped, not extended. */
  startDrawing(type: ZoneType): void;
  /** Adds a corner to the draft. Does nothing when the plan is not in drawing mode. */
  addDraftPoint(point: Point): void;
  /** Drops the last corner of the draft; the type and the mode stay. */
  removeLastDraftPoint(): void;
  /** Leaves drawing mode and drops the draft. */
  cancelDrawing(): void;
  /** Turns the draft into a zone: 3+ points build one (D3), fewer leave the plan as it was. */
  finishDrawing(): void;
  /** Selects a zone by id, or clears the selection with `null`. */
  selectZone(id: string | null): void;
  /** Removes a zone; the selection is cleared when it was the deleted one. */
  deleteZone(id: string): void;
}

/** The vanilla store handle: `getState()`, `setState()`, `subscribe()` — no React needed to use or test it. */
export type PlanStore = StoreApi<PlanState>;

/** What a caller may preset; everything left out gets the demo project, a placeholder viewport and no canvas. */
export interface PlanStoreOptions {
  readonly project?: Project;
  readonly viewport?: Viewport;
  readonly canvasSize?: Size;
  /**
   * How a new zone gets its id (D11). Injectable so a test can name the ids it expects instead of asserting on a
   * UUID; the app leaves it out and gets `crypto.randomUUID`.
   */
  readonly newId?: () => string;
}

/** A canvas that was never measured. A hidden element reports a zero size, so zero is "unknown", not "empty". */
function isUnmeasured(size: Size): boolean {
  return size.width <= 0 || size.height <= 0;
}

/** The least a usable zone outline needs (D3): `finishDrawing` below this leaves the plan alone. */
const MIN_ZONE_POINTS = 3;

/** The viewport that shows the whole base area of `project` in a canvas of `size`. */
function fittedViewport(project: Project, size: Size): Viewport {
  return fitToRect(boundsOf(project.baseArea.points), size, FIT_MARGIN_PX);
}

/** The project the app starts with until project persistence exists (M3): a 10 x 6 m garden. */
function createDemoProject(): Project {
  return createProject({ id: 'demo', name: 'Demo garden', baseArea: createRectangleBaseArea(10, 6) });
}

/**
 * The plan store. `shared/` owns every calculation, this only holds the current project and viewport and swaps
 * the viewport for the one the pure functions return — actions never mutate state objects.
 */
export function createPlanStore(initial: PlanStoreOptions = {}): PlanStore {
  const project = initial.project ?? createDemoProject();
  const canvasSize = initial.canvasSize ?? UNMEASURED_CANVAS;
  const newId = initial.newId ?? (() => crypto.randomUUID());
  // A caller that already knows the canvas size gets the fitted view right away; without one there is nothing to
  // fit into, so the placeholder viewport stands until the first `setCanvasSize`.
  const viewport = initial.viewport ?? (isUnmeasured(canvasSize) ? DEFAULT_VIEWPORT : fittedViewport(project, canvasSize));

  return createStore<PlanState>((set, get) => ({
    project,
    viewport,
    canvasSize,
    // Nothing is drawn or selected on the way in: every zone action below writes both fields explicitly.
    drawing: null,
    selectedZoneId: null,

    setCanvasSize(size: Size): void {
      const { canvasSize, project } = get();
      // A resize after the first measurement keeps the user's zoom and pan; only the first one fits the plan.
      set({
        canvasSize: size,
        ...(isUnmeasured(canvasSize) ? { viewport: fittedViewport(project, size) } : {}),
      });
    },

    zoomAt(screenPoint: Point, factor: number): void {
      set({ viewport: zoomViewport(get().viewport, screenPoint, factor) });
    },

    panBy(dxPx: number, dyPx: number): void {
      set({ viewport: panViewport(get().viewport, dxPx, dyPx) });
    },

    fitProject(): void {
      const { project, canvasSize } = get();
      set({ viewport: fittedViewport(project, canvasSize) });
    },

    setDisplayUnit(unit: LengthUnit): void {
      // Only the unit field is replaced: `baseArea` and `zones` keep their identity, so a component that selects
      // them does not re-render for a unit switch.
      set({ project: { ...get().project, displayUnit: unit } });
    },

    setBaseAreaRectangle(widthMeters: number, heightMeters: number): void {
      const { project, canvasSize } = get();
      // Built before the write: `createRectangleBaseArea` rejects an unusable size (0, negative, non-finite) with
      // a RangeError, and a throw must leave the store as it was rather than half-updated.
      const updated: Project = { ...project, baseArea: createRectangleBaseArea(widthMeters, heightMeters) };
      // One write, not `set` + `fitProject()`: the new rectangle has to be drawn in a viewport that shows it, and
      // two writes would render it once in the old viewport.
      set({ project: updated, viewport: fittedViewport(updated, canvasSize) });
    },

    startDrawing(type: ZoneType): void {
      // A running draft is replaced, not extended: "Draw zone" with another type means "start over with this one".
      // The selection is cleared so the plan shows the new draft rather than the last zone's highlight.
      set({ drawing: { type, points: [] }, selectedZoneId: null });
    },

    addDraftPoint(point: Point): void {
      const { drawing } = get();
      // A click on the plan when nothing is being drawn is not a corner of anything — it is ignored rather than
      // taken as an implicit start, so the type in the panel stays the one the user chose.
      if (!drawing) return;
      set({ drawing: { type: drawing.type, points: [...drawing.points, { x: point.x, y: point.y }] } });
    },

    removeLastDraftPoint(): void {
      const { drawing } = get();
      if (!drawing || drawing.points.length === 0) return;
      set({ drawing: { type: drawing.type, points: drawing.points.slice(0, -1) } });
    },

    cancelDrawing(): void {
      // Cancelling an empty plan state is a no-op rather than a second write: the action is bound to Escape and
      // to a button that is always there, and neither should notify subscribers when there is nothing to drop.
      if (!get().drawing) return;
      set({ drawing: null });
    },

    finishDrawing(): void {
      const { drawing, project } = get();
      if (!drawing) return;
      // Fewer than three corners are not a polygon (D3): the draft stays as it is, so the user can add the missing
      // corner instead of losing what they clicked. The panel disables Finish below three points as well; this is
      // the rule itself, not the button's state.
      if (drawing.points.length < MIN_ZONE_POINTS) return;

      const zone = createZone({
        id: newId(),
        type: drawing.type,
        points: drawing.points,
        name: nextZoneName(project.zones, drawing.type),
      });
      // The new zone is selected, so the figures the user just drew are the ones the list highlights. `addZone`
      // throws on a duplicate id and the throw leaves the store untouched, as everywhere else in this store.
      set({ project: addZone(project, zone), drawing: null, selectedZoneId: zone.id });
    },

    selectZone(id: string | null): void {
      // Deselecting is always allowed; selecting an id that is not in the project would leave a highlight nobody
      // can clear, so only a zone that exists can become the selection.
      if (id !== null && !get().project.zones.some((zone) => zone.id === id)) return;
      set({ selectedZoneId: id });
    },

    deleteZone(id: string): void {
      const { project, selectedZoneId } = get();
      const remaining = project.zones.filter((zone) => zone.id !== id);
      // Nothing was removed: no write, so a stale id cannot notify subscribers or clear a selection.
      if (remaining.length === project.zones.length) return;
      set({
        project: { ...project, zones: remaining },
        selectedZoneId: selectedZoneId === id ? null : selectedZoneId,
      });
    },
  }));
}

/** The app-wide store instance; `web/` components read it, tests build their own with `createPlanStore`. */
export const planStore = createPlanStore();
