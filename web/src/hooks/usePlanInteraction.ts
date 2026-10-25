import { useEffect, type RefObject } from 'react';
import { planStore } from '../state/plan-store.js';
import { isClick } from '../plan/click.js';
import { screenToWorld } from '../plan/viewport.js';

/** Wheel sensitivity: `exp(-deltaY * 0.002)`, so ~500 px of wheel travel changes the scale by a factor of `e`. */
const WHEEL_ZOOM_FACTOR = 0.002;

/** The class the base area carries: a drag that starts on it is not a background pan. */
const BASE_AREA_CLASS = 'plan-base-area';

/** The pointer that owns the current drag, and where it was when it was last seen. */
interface DragState {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

/** Where the pointer went down, kept so the up event can tell a click from a pan. */
interface GestureState {
  readonly pointerId: number;
  readonly fromX: number;
  readonly fromY: number;
}

/**
 * Registers the plan's input gestures on `svg`: wheel zoom around the cursor, drag pan, click-to-add-a-corner
 * while drawing, the drawing keys, and the canvas size from a `ResizeObserver`. Returns the cleanup that removes
 * all of them.
 *
 * These are native listeners in an effect because React's props cannot express them: `onWheel` is registered
 * passively (so `preventDefault` would be a no-op and the page would scroll), `setPointerCapture` needs the event
 * object, and the observer is not a React concept. The handlers read `planStore.getState()` at event time instead
 * of closing over the state: a dependency on it would tear the listeners down on every zoom, and a pan in progress
 * would lose its captured pointer with them.
 */
function attachPlanInteraction(svg: SVGSVGElement): () => void {
  /** The pointer position relative to the SVG's top-left corner, which is the screen space the store uses. */
  function localPoint(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = svg.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onWheel(event: WheelEvent): void {
    // The page itself does not scroll; without this the wheel would scroll the document instead of zooming.
    event.preventDefault();
    planStore.getState().zoomAt(localPoint(event), Math.exp(-event.deltaY * WHEEL_ZOOM_FACTOR));
  }

  let drag: DragState | null = null;
  let gesture: GestureState | null = null;

  function onPointerDown(event: PointerEvent): void {
    // Left button only, and only on the background: dragging the base area itself is a later, editing gesture.
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.classList.contains(BASE_AREA_CLASS)) return;
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    // recorded before the capture, so the up event can compare the two ends of the gesture
    gesture = { pointerId: event.pointerId, fromX: event.clientX, fromY: event.clientY };
    svg.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    planStore.getState().panBy(event.clientX - drag.x, event.clientY - drag.y);
    drag = { pointerId: drag.pointerId, x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    drag = null;

    // The 4 px rule: a gesture that barely moved is a click, and a click in drawing mode places a corner. The
    // pan above has already run, which is harmless for a few pixels — the world point is read from the *current*
    // viewport, so the corner lands where the pointer is now, not where the viewport was before the tiny move.
    const ended = gesture;
    gesture = null;
    if (!ended || ended.pointerId !== event.pointerId) return;
    if (!isClick({ from: { x: ended.fromX, y: ended.fromY }, to: { x: event.clientX, y: event.clientY } })) return;

    const state = planStore.getState();
    if (!state.drawing) return;
    const screen = localPoint(event);
    // the draft is in world metres: the click is converted with the same maths the drawing uses (D1)
    state.addDraftPoint(screenToWorld(state.viewport, screen));
  }

  /** The drawing keys, read while the plan or the panel has focus (the task's binding decision). */
  function onKeyDown(event: KeyboardEvent): void {
    const state = planStore.getState();
    if (event.key === 'Escape') {
      // Escape also drops a selection, so the key always means "back out of what I am doing".
      if (state.drawing) state.cancelDrawing();
      else state.selectZone(null);
      return;
    }
    if (!state.drawing) return;
    if (event.key === 'Enter') state.finishDrawing();
    // Backspace must not navigate back in the browser: it does here only while a draft is running
    else if (event.key === 'Backspace') {
      event.preventDefault();
      state.removeLastDraftPoint();
    } else return;
    // Enter is a button activation key too: without this, a focused "Finish" would run the action twice.
    event.preventDefault();
  }

  // The SVG is laid out to fill its wrapper, so its own box is the canvas the store measures. The observer's
  // entries are not used on purpose: for SVG elements the reported content box is not the CSS box, and the store
  // wants the CSS pixels the pointer maths works in.
  const observer = new ResizeObserver(() => {
    const rect = svg.getBoundingClientRect();
    planStore.getState().setCanvasSize({ width: rect.width, height: rect.height });
  });

  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('pointercancel', onPointerUp);
  // on the SVG rather than on the window: the keys belong to the plan, and a window listener would also fire
  // while the user types in the panel's number fields.
  svg.addEventListener('keydown', onKeyDown);
  observer.observe(svg);

  return () => {
    svg.removeEventListener('wheel', onWheel);
    svg.removeEventListener('pointerdown', onPointerDown);
    svg.removeEventListener('pointermove', onPointerMove);
    svg.removeEventListener('pointerup', onPointerUp);
    svg.removeEventListener('pointercancel', onPointerUp);
    svg.removeEventListener('keydown', onKeyDown);
    // Without `disconnect` the observer keeps the element (and the store write) alive after the unmount.
    observer.disconnect();
  };
}

/**
 * Wires the gestures on the SVG `svgRef` points at. Under `StrictMode` the effect runs twice, so `attach` and
 * `detach` have to be symmetric — they are: every listener is registered with the same options object shape and
 * the observer is disconnected.
 */
export function usePlanInteraction(svgRef: RefObject<SVGSVGElement | null>): void {
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    return attachPlanInteraction(svg);
  }, [svgRef]);
}
