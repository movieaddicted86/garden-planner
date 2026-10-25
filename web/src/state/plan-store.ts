import { createProject, createRectangleBaseArea, type LengthUnit, type Point, type Project } from '@garden-planner/shared';
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

/** Free space the fitted plan keeps around the base area, in CSS pixels. */
const FIT_MARGIN_PX = 40;

/**
 * The viewport before the canvas size is known. It is never a view the user works in — the first
 * `setCanvasSize` fits the plan — so it only has to be a legal, sane viewport rather than the right one.
 */
const DEFAULT_VIEWPORT: Viewport = { scale: MIN_SCALE, originX: 0, originY: 0 };

/** The canvas before it has been measured. A zero size means "not measured yet", not "nothing to draw". */
const UNMEASURED_CANVAS: Size = { width: 0, height: 0 };

/** The store state: the project and the two things the plan view needs to draw it (T-008). */
export interface PlanState {
  readonly project: Project;
  readonly viewport: Viewport;
  readonly canvasSize: Size;
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
}

/** The vanilla store handle: `getState()`, `setState()`, `subscribe()` — no React needed to use or test it. */
export type PlanStore = StoreApi<PlanState>;

/** What a caller may preset; everything left out gets the demo project, a placeholder viewport and no canvas. */
export interface PlanStoreOptions {
  readonly project?: Project;
  readonly viewport?: Viewport;
  readonly canvasSize?: Size;
}

/** A canvas that was never measured. A hidden element reports a zero size, so zero is "unknown", not "empty". */
function isUnmeasured(size: Size): boolean {
  return size.width <= 0 || size.height <= 0;
}

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
  // A caller that already knows the canvas size gets the fitted view right away; without one there is nothing to
  // fit into, so the placeholder viewport stands until the first `setCanvasSize`.
  const viewport = initial.viewport ?? (isUnmeasured(canvasSize) ? DEFAULT_VIEWPORT : fittedViewport(project, canvasSize));

  return createStore<PlanState>((set, get) => ({
    project,
    viewport,
    canvasSize,

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
  }));
}

/** The app-wide store instance; `web/` components read it, tests build their own with `createPlanStore`. */
export const planStore = createPlanStore();
