import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addZone, createProject, createRectangleBaseArea, createZone, type Point, type Project } from '@garden-planner/shared';
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

/** A fitted store whose project has a zone, so "keeps the zones" is an assertion about something that exists. */
function fittedStoreWithZone() {
  const zone = createZone({
    id: 'zone-1',
    type: 'bed',
    points: [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
    ],
  });
  const project = addZone(createProject({ id: 'p1', name: 'With a zone', baseArea: createRectangleBaseArea(10, 6) }), zone);
  const store = createPlanStore({ project });
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
  assert.equal(
    countNotifications((state) => state.setDisplayUnit('cm')),
    1,
  );
  assert.equal(
    countNotifications((state) => state.setBaseAreaRectangle(8, 4)),
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

test('AC-2: setDisplayUnit changes the unit and leaves everything else identical (D2)', () => {
  const store = fittedStoreWithZone();
  const before = store.getState();

  store.getState().setDisplayUnit('cm');

  const after = store.getState();
  assert.equal(after.project.displayUnit, 'cm');
  // the same objects, not equal copies: nothing but the unit field may have been rebuilt
  assert.equal(after.project.baseArea, before.project.baseArea);
  assert.equal(after.project.zones, before.project.zones);
  assert.equal(after.project.zones[0], before.project.zones[0]);
  assert.deepEqual(after.project, { ...before.project, displayUnit: 'cm' });
  // a unit switch is a display change: the view the user works in stays as it is
  assert.equal(after.viewport, before.viewport);
});

test('AC-2: setBaseAreaRectangle replaces the base area and fits the new rectangle', () => {
  const store = fittedStoreWithZone();
  const before = store.getState();

  store.getState().setBaseAreaRectangle(12.5, 6);

  const after = store.getState();
  assert.deepEqual(after.project.baseArea.points, [
    { x: 0, y: 0 },
    { x: 12.5, y: 0 },
    { x: 12.5, y: 6 },
    { x: 0, y: 6 },
  ]);
  assert.equal(after.project.zones, before.project.zones);
  assert.deepEqual(after.project.zones, before.project.zones);
  assert.equal(after.project.displayUnit, before.project.displayUnit);
  assert.deepEqual(after.viewport, expectedFit(after.project, CANVAS));
  // the fit is the new rectangle's: a viewport that was not recomputed would still show the old one
  assert.notDeepEqual(after.viewport, before.viewport);
});

test('AC-2: setBaseAreaRectangle rejects an unusable size and changes nothing', () => {
  const store = fittedStoreWithZone();
  const before = store.getState();

  for (const [width, height] of [
    [0, 6],
    [12.5, 0],
    [-3, 6],
    [12.5, -1],
    [Number.NaN, 6],
    [12.5, Number.POSITIVE_INFINITY],
  ]) {
    assert.throws(() => store.getState().setBaseAreaRectangle(width, height), RangeError, `${width} x ${height}`);
    assert.equal(store.getState().project, before.project);
    assert.equal(store.getState().viewport, before.viewport);
  }
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
