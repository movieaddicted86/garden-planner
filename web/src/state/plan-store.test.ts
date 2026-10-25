import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Point, Project } from '@garden-planner/shared';
import { createPlanStore, planStore } from './plan-store.js';
import type { PlanState } from './plan-store.js';
import { boundsOf, fitToRect } from '../plan/viewport.js';
import type { Size, Viewport } from '../plan/viewport.js';

/** The canvas of AC-8 and the 40 px margin `fitProject` uses (the store's `FIT_MARGIN_PX`). */
const CANVAS: Size = { width: 1000, height: 600 };
const MARGIN_PX = 40;

/** The viewport `fitProject` has to produce for a project in a canvas. */
function expectedFit(project: Project, size: Size): Viewport {
  return fitToRect(boundsOf(project.baseArea.points), size, MARGIN_PX);
}

/** The world point under a screen point, read from the store's own viewport. */
function worldFrom(state: PlanState, screenPoint: Point): Point {
  return {
    x: state.viewport.originX + screenPoint.x / state.viewport.scale,
    y: state.viewport.originY + screenPoint.y / state.viewport.scale,
  };
}

/** A store that has already seen a canvas, so the first-measurement fit is behind it. */
function fittedStore() {
  const store = createPlanStore();
  store.getState().setCanvasSize(CANVAS);
  return store;
}

/** Counts the notifications a subscriber gets while running `action` on a fitted store. */
function countNotifications(action: (state: PlanState) => void): number {
  const store = fittedStore();

  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });
  action(store.getState());
  unsubscribe();
  return notifications;
}

test('AC-8: the first canvas size fits the demo base area with a 40 px margin', () => {
  const store = createPlanStore();
  const before = store.getState();
  assert.notDeepEqual(before.viewport, expectedFit(before.project, CANVAS));

  store.getState().setCanvasSize(CANVAS);

  const after = store.getState();
  assert.deepEqual(after.canvasSize, CANVAS);
  assert.deepEqual(after.viewport, expectedFit(after.project, CANVAS));
  // The 10 x 6 m garden is wider than the canvas is tall, so the height is the constraining axis.
  assert.equal(after.viewport.scale, (CANVAS.height - 2 * MARGIN_PX) / 6);
});

test('AC-8: the demo project is the 10 x 6 m garden of the task', () => {
  const { project } = planStore.getState();
  assert.equal(project.id, 'demo');
  assert.equal(project.name, 'Demo garden');
  assert.deepEqual(project.baseArea.points, [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 6 },
    { x: 0, y: 6 },
  ]);
});

test('AC-8: a later resize keeps the viewport instead of refitting', () => {
  const store = fittedStore();
  const fitted = store.getState().viewport;

  store.getState().setCanvasSize({ width: 1200, height: 800 });

  assert.deepEqual(store.getState().canvasSize, { width: 1200, height: 800 });
  assert.deepEqual(store.getState().viewport, fitted);
});

test('AC-8: zoomAt and panBy replace the viewport and leave the project object alone', () => {
  const store = fittedStore();
  const { project, viewport } = store.getState();

  store.getState().zoomAt({ x: 250, y: 50 }, 2);

  const zoomed = store.getState();
  assert.notEqual(zoomed.viewport, viewport);
  assert.equal(zoomed.project, project);
  assert.equal(zoomed.viewport.scale, viewport.scale * 2);

  store.getState().panBy(100, -50);

  const panned = store.getState();
  assert.notEqual(panned.viewport, zoomed.viewport);
  assert.equal(panned.project, project);
  assert.equal(panned.viewport.scale, zoomed.viewport.scale);
  assert.equal(panned.viewport.originX, zoomed.viewport.originX - 100 / zoomed.viewport.scale);
  assert.equal(panned.viewport.originY, zoomed.viewport.originY + 50 / zoomed.viewport.scale);
});

test('AC-8: zoomAt keeps the world point under the screen point', () => {
  const store = fittedStore();
  const point: Point = { x: 250, y: 50 };
  const worldBefore = worldFrom(store.getState(), point);

  store.getState().zoomAt(point, 1.5);

  const worldAfter = worldFrom(store.getState(), point);
  assert.ok(Math.abs(worldAfter.x - worldBefore.x) < 1e-9, `${worldBefore.x} -> ${worldAfter.x}`);
  assert.ok(Math.abs(worldAfter.y - worldBefore.y) < 1e-9, `${worldBefore.y} -> ${worldAfter.y}`);
});

test('AC-8: fitProject restores the fitted viewport after zooming and panning', () => {
  const store = fittedStore();
  const fitted = store.getState().viewport;

  store.getState().zoomAt({ x: 250, y: 50 }, 3);
  store.getState().panBy(120, -80);
  assert.notDeepEqual(store.getState().viewport, fitted);

  store.getState().fitProject();

  assert.deepEqual(store.getState().viewport, fitted);
});

test('AC-8: a subscriber is notified exactly once per action', () => {
  assert.equal(
    countNotifications((state) => state.setCanvasSize({ width: 1200, height: 800 })),
    1,
  );
  assert.equal(
    countNotifications((state) => state.zoomAt({ x: 250, y: 50 }, 2)),
    1,
  );
  assert.equal(
    countNotifications((state) => state.panBy(10, 10)),
    1,
  );
  assert.equal(
    countNotifications((state) => state.fitProject()),
    1,
  );
});

test('AC-8: an unmeasured canvas is not fitted and the store stays usable', () => {
  const store = createPlanStore();

  assert.deepEqual(store.getState().canvasSize, { width: 0, height: 0 });
  // Nothing was measured yet, so the placeholder viewport stands instead of a fit into a zero-sized canvas.
  assert.equal(store.getState().viewport.scale, 10);
  assert.equal(store.getState().project.id, 'demo');
});

test('AC-8: an invalid action argument leaves the state untouched', () => {
  const store = fittedStore();
  const before = store.getState();

  assert.throws(() => store.getState().zoomAt({ x: 1, y: 1 }, 0), RangeError);
  assert.throws(() => store.getState().panBy(Number.NaN, 0), RangeError);

  assert.equal(store.getState().viewport, before.viewport);
  assert.equal(store.getState().project, before.project);
});

test('AC-8: the store only moves the viewport, never the project', () => {
  const store = fittedStore();
  const project = store.getState().project;

  store.getState().zoomAt({ x: 10, y: 10 }, 2);
  store.getState().panBy(-40, 25);
  store.getState().fitProject();

  assert.equal(store.getState().project, project);
  assert.deepEqual(store.getState().project.baseArea, project.baseArea);
});
