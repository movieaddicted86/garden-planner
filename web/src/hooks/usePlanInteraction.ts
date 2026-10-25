import { useEffect, type RefObject } from 'react';
import { planStore } from '../state/plan-store.js';

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

/**
 * Registers the plan's input gestures on `svg`: wheel zoom around the cursor, drag pan on the background and the
 * canvas size from a `ResizeObserver`. Returns the cleanup that removes all of them.
 *
 * These are native listeners in an effect because React's props cannot express them: `onWheel` is registered
 * passively (so `preventDefault` would be a no-op and the page would scroll), `setPointerCapture` needs the event
 * object, and the observer is not a React concept. The handlers read `planStore.getState()` at event time instead
 * of closing over the viewport: a dependency on it would tear the listeners down on every zoom, and a pan in
 * progress would lose its captured pointer with them.
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

  function onPointerDown(event: PointerEvent): void {
    // Left button only, and only on the background: dragging the base area itself is a later, editing gesture.
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.classList.contains(BASE_AREA_CLASS)) return;
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
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
  observer.observe(svg);

  return () => {
    svg.removeEventListener('wheel', onWheel);
    svg.removeEventListener('pointerdown', onPointerDown);
    svg.removeEventListener('pointermove', onPointerMove);
    svg.removeEventListener('pointerup', onPointerUp);
    svg.removeEventListener('pointercancel', onPointerUp);
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
