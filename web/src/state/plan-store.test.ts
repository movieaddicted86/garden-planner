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

/** A fitted store that has a zone to select, delete or finish a draft into; the setup of `countNotifications`. */
function preparedStore() {
  return fittedStoreWithZone();
}

/** The four corners of AC-2: a 3 x 2 m rectangle, area 6 m², perimeter 10 m. */
const BED_POINTS: readonly Point[] = [
  { x: 1, y: 1 },
  { x: 4, y: 1 },
  { x: 4, y: 3 },
  { x: 1, y: 3 },
];

/** A store with a canvas behind it whose ids are `zone-1`, `zone-2`, … in the order they are asked for (AC-1). */
function drawingStore(ids: readonly string[] = ['zone-1', 'zone-2', 'zone-3']) {
  let next = 0;
  const store = createPlanStore({
    newId: () => {
      const id = ids[next];
      if (id === undefined) throw new Error(`drawingStore: more ids asked for than given (${ids.length})`);
      next += 1;
      return id;
    },
  });
  store.getState().setCanvasSize(CANVAS);
  return store;
}

/** Clicks `points` into the store's running draft. */
function addPoints(state: PlanState, points: readonly Point[]): void {
  for (const point of points) state.addDraftPoint(point);
}

/**
 * Counts the notifications a subscriber gets while running `action` on a fitted store. `prepare` runs before the
 * subscription, so an action that needs a zone to act on or a drawing in progress is counted on its own write
 * rather than on the setup's.
 */
function countNotifications(action: (state: PlanState) => void, prepare?: (state: PlanState) => void): number {
  const store = preparedStore();

  if (prepare) prepare(store.getState());

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

test('AC-1: finishDrawing with 2 points leaves the zones alone and keeps drawing', () => {
  const store = drawingStore();
  const before = store.getState().project;

  store.getState().startDrawing('bed');
  addPoints(store.getState(), [
    { x: 1, y: 1 },
    { x: 4, y: 1 },
  ]);
  store.getState().finishDrawing();

  const after = store.getState();
  // the same project object: not "an equal copy", nothing was written at all
  assert.equal(after.project, before);
  assert.equal(after.project.zones.length, 0);
  // the two clicks are still there, so the missing corner can be added instead of started over
  assert.deepEqual(after.drawing, {
    type: 'bed',
    points: [
      { x: 1, y: 1 },
      { x: 4, y: 1 },
    ],
  });
});

test('AC-1: finishDrawing with 3 points adds exactly one zone, selects it and ends drawing', () => {
  const store = drawingStore();
  const before = store.getState().project;

  store.getState().startDrawing('bed');
  addPoints(store.getState(), BED_POINTS.slice(0, 3));
  store.getState().finishDrawing();

  const after = store.getState();
  assert.equal(after.project.zones.length, 1);
  const zone = after.project.zones[0];
  assert.equal(zone.id, 'zone-1');
  assert.equal(zone.name, 'Bed 1');
  assert.equal(zone.type, 'bed');
  assert.deepEqual(zone.points, BED_POINTS.slice(0, 3));
  // a fully edged zone (D10): every edge takes part until the user switches one off
  assert.deepEqual(zone.edging, [true, true, true]);
  assert.equal(after.selectedZoneId, 'zone-1');
  assert.equal(after.drawing, null);
  // the old project is untouched (the store never mutates a state object)
  assert.equal(before.zones.length, 0);
  assert.notEqual(after.project, before);
});

test('AC-1: the ids come from the injected newId, and the name numbers per type', () => {
  const store = drawingStore(['first-id', 'second-id']);

  store.getState().startDrawing('bed');
  addPoints(store.getState(), BED_POINTS.slice(0, 3));
  store.getState().finishDrawing();
  store.getState().startDrawing('bed');
  addPoints(store.getState(), BED_POINTS);
  store.getState().finishDrawing();

  const zones = store.getState().project.zones;
  assert.deepEqual(
    zones.map((zone) => zone.id),
    ['first-id', 'second-id'],
  );
  assert.deepEqual(
    zones.map((zone) => zone.name),
    ['Bed 1', 'Bed 2'],
  );
  // the last zone drawn is the selected one
  assert.equal(store.getState().selectedZoneId, 'second-id');
});

test('AC-1: startDrawing cancels a running draft instead of extending it', () => {
  const store = drawingStore();

  store.getState().startDrawing('bed');
  addPoints(store.getState(), BED_POINTS.slice(0, 2));
  store.getState().startDrawing('path');

  assert.deepEqual(store.getState().drawing, { type: 'path', points: [] });
});

test('AC-1: removeLastDraftPoint drops one point, cancelDrawing drops the draft', () => {
  const store = drawingStore();

  store.getState().startDrawing('bed');
  addPoints(store.getState(), BED_POINTS.slice(0, 3));
  store.getState().removeLastDraftPoint();

  assert.deepEqual(store.getState().drawing, { type: 'bed', points: BED_POINTS.slice(0, 2) });
  // below the minimum there is no zone to build, and drawing goes on
  store.getState().finishDrawing();
  assert.equal(store.getState().project.zones.length, 0);
  assert.notEqual(store.getState().drawing, null);

  store.getState().cancelDrawing();
  assert.equal(store.getState().drawing, null);
  assert.equal(store.getState().project.zones.length, 0);
});

test('AC-1: addDraftPoint outside drawing mode, removeLast on an empty draft and cancel are no-ops', () => {
  // a click on the plan outside drawing mode is not a corner of anything
  assert.equal(
    countNotifications((state) => state.addDraftPoint({ x: 1, y: 1 })),
    0,
  );

  // none of these has anything to change: no write, so no notification
  const idle = drawingStore();
  let notifications = 0;
  const unsubscribe = idle.subscribe(() => {
    notifications += 1;
  });
  idle.getState().addDraftPoint({ x: 1, y: 1 });
  idle.getState().removeLastDraftPoint();
  idle.getState().cancelDrawing();
  idle.getState().finishDrawing();
  idle.getState().selectZone('does-not-exist');
  idle.getState().deleteZone('does-not-exist');
  unsubscribe();
  assert.equal(notifications, 0);

  // inside drawing mode, an empty draft has nothing to remove either
  idle.getState().startDrawing('lawn');
  const withEmptyDraft = idle.getState();
  idle.getState().removeLastDraftPoint();
  assert.equal(idle.getState().drawing, withEmptyDraft.drawing);
});

test('AC-1: deleteZone removes only that zone and clears the selection if it was selected', () => {
  const store = drawingStore(['zone-a', 'zone-b']);

  for (const type of ['bed', 'path'] as const) {
    store.getState().startDrawing(type);
    addPoints(store.getState(), BED_POINTS.slice(0, 3));
    store.getState().finishDrawing();
  }
  const before = store.getState();
  assert.equal(before.selectedZoneId, 'zone-b');
  assert.equal(before.project.zones.length, 2);

  store.getState().deleteZone('zone-b');

  const after = store.getState();
  assert.deepEqual(
    after.project.zones.map((zone) => zone.id),
    ['zone-a'],
  );
  // the deleted zone was the selected one, so nothing is selected now
  assert.equal(after.selectedZoneId, null);
  assert.equal(before.project.zones.length, 2, 'the previous project must not have been mutated');

  // deleting a zone that is not the selected one keeps the selection
  store.getState().selectZone('zone-a');
  store.getState().deleteZone('zone-b');
  assert.equal(store.getState().selectedZoneId, 'zone-a');
});

test('AC-1: selectZone takes an existing id and clears with null', () => {
  const store = fittedStoreWithZone();

  store.getState().selectZone('zone-1');
  assert.equal(store.getState().selectedZoneId, 'zone-1');

  store.getState().selectZone(null);
  assert.equal(store.getState().selectedZoneId, null);

  // an unknown id would leave a highlight that cannot be cleared by clicking the zone it names
  store.getState().selectZone('zone-1');
  store.getState().selectZone('nope');
  assert.equal(store.getState().selectedZoneId, 'zone-1');
});

test('AC-8: every zone action that writes notifies exactly once', () => {
  // One action at a time, so the count is the action's own: a batch total would hide an action that writes twice
  // behind one that writes not at all. `prepare` sets up whatever the action needs to have something to change.
  const actions: readonly [string, (state: PlanState) => void, ((state: PlanState) => void)?][] = [
    ['startDrawing', (state) => state.startDrawing('bed')],
    ['addDraftPoint', (state) => state.addDraftPoint({ x: 1, y: 1 }), (state) => state.startDrawing('bed')],
    [
      'removeLastDraftPoint',
      (state) => state.removeLastDraftPoint(),
      (state) => {
        state.startDrawing('bed');
        state.addDraftPoint({ x: 1, y: 1 });
      },
    ],
    ['cancelDrawing', (state) => state.cancelDrawing(), (state) => state.startDrawing('bed')],
    ['selectZone', (state) => state.selectZone('zone-1')],
    ['deleteZone', (state) => state.deleteZone('zone-1')],
  ];

  for (const [name, action, prepare] of actions) {
    assert.equal(countNotifications(action, prepare), 1, `${name} must write once`);
  }

  // `finishDrawing` only writes once the draft is a polygon; both paths are one action either way
  const withDraft = () => {
    const store = drawingStore();
    store.getState().startDrawing('bed');
    addPoints(store.getState(), BED_POINTS.slice(0, 3));
    return store;
  };
  let notifications = 0;
  const tooShort = drawingStore();
  tooShort.getState().startDrawing('bed');
  tooShort.getState().addDraftPoint({ x: 1, y: 1 });
  const unsubscribeShort = tooShort.subscribe(() => {
    notifications += 1;
  });
  tooShort.getState().finishDrawing();
  unsubscribeShort();
  assert.equal(notifications, 0, 'a draft below the minimum must not write');

  notifications = 0;
  const enough = withDraft();
  const unsubscribe = enough.subscribe(() => {
    notifications += 1;
  });
  enough.getState().finishDrawing();
  unsubscribe();
  assert.equal(notifications, 1, 'a finished draft must write once');
});

test('AC-1: drawing does not move the viewport and a draft keeps its own points', () => {
  const store = drawingStore();
  const { viewport, project } = store.getState();

  store.getState().startDrawing('gravel');
  const first = store.getState().drawing;
  store.getState().addDraftPoint({ x: 2, y: 2 });
  const second = store.getState().drawing;

  assert.equal(store.getState().viewport, viewport);
  assert.equal(store.getState().project, project);
  // a new draft object per click: the previous one is not extended in place
  assert.notEqual(first, second);
  assert.deepEqual(first, { type: 'gravel', points: [] });
  assert.deepEqual(second, { type: 'gravel', points: [{ x: 2, y: 2 }] });
});
