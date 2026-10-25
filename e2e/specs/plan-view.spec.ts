/**
 * The plan view: base area, grid, scale bar, zoom, pan and fit.
 *
 * Coordinates: the SVG has no `viewBox` and fills its wrapper, so one SVG user unit is one CSS pixel and the
 * `points` attribute of the base area is its screen position relative to the SVG's top-left corner. The geometry
 * assertions therefore read the attribute instead of `boundingBox()`: the drawn bounding box is clipped by the
 * SVG viewport once the plan is zoomed in, and `boundingBox()` would report the clip, not the plan.
 */
import { formatLength } from '@garden-planner/shared';
import { expect, test, type Page } from '@playwright/test';

/** The wheel step of AC-3: `exp(-deltaY * 0.002)` is `exp(0.6)` for one -300 step. */
const WHEEL_STEP = -300;
const ZOOM_FACTOR = Math.exp(0.6);

/** The free space the store's fit keeps around the base area (FIT_MARGIN_PX in `plan-store.ts`). */
const FIT_MARGIN_PX = 40;

/** A rectangle in SVG coordinates (CSS pixels, origin at the SVG's top-left corner). */
interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A point in SVG coordinates. */
interface Vec {
  readonly x: number;
  readonly y: number;
}

/** Console and page errors of the running test; AC-9. */
const pageErrors: string[] = [];

/** The SVG's box on the page, so SVG coordinates can be turned into a mouse position. */
async function planBox(page: Page): Promise<Box> {
  const box = await page.getByTestId('plan-svg').boundingBox();
  if (!box) throw new Error('the plan SVG has no box');
  return box;
}

/** The base area's vertices in SVG coordinates, in the order the app drew them. */
async function baseAreaPoints(page: Page): Promise<Vec[]> {
  const points = await page.getByTestId('base-area').getAttribute('points');
  if (!points) throw new Error('the base area has no points attribute');
  return points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });
}

/** One vertex of the base area, counted from the end for the ones that stay on the canvas while zooming in. */
async function baseAreaCorner(page: Page, index: number): Promise<Vec> {
  const points = await baseAreaPoints(page);
  const corner = points.at(index);
  if (!corner) throw new Error(`the base area has no vertex ${index}`);
  return corner;
}

/** The bounding box of the base area's vertices. */
async function baseAreaBounds(page: Page): Promise<Box> {
  const points = await baseAreaPoints(page);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** The viewport scale the SVG reports (3 decimals, as AC-2 requires). */
async function planScale(page: Page): Promise<number> {
  return Number(await page.getByTestId('plan-svg').getAttribute('data-scale'));
}

/** The start and end x of the drawn scale bar, so its pixel length can be measured. */
async function scaleBarEnds(page: Page): Promise<Vec> {
  return {
    x: Number(await page.getByTestId('scale-bar').getAttribute('x1')),
    y: Number(await page.getByTestId('scale-bar').getAttribute('x2')),
  };
}

/** Moves the mouse to an SVG point. `page.mouse.wheel` has no position of its own, it zooms where the mouse is. */
async function moveToPlanPoint(page: Page, point: Vec): Promise<void> {
  const box = await planBox(page);
  await page.mouse.move(box.x + point.x, box.y + point.y);
}

test.beforeEach(async ({ page }) => {
  pageErrors.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  // The base area is drawn only after the canvas has been measured, and that first measurement also fits the plan:
  // waiting for it therefore waits for the fitted view rather than for the placeholder viewport.
  await expect(page.getByTestId('base-area')).toBeVisible();
});

test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

test('draws the fitted base area on a grid with a scale bar', async ({ page }) => {
  await expect(page.getByTestId('plan-svg')).toBeVisible();
  await expect(page.getByTestId('plan-svg')).toHaveAttribute('aria-label', 'Garden plan');
  await expect(page.getByTestId('base-area')).toBeVisible();
  await expect(page.getByTestId('scale-bar-label')).toBeVisible();

  // AC-1: the plan lies inside the SVG with room to spare.
  const svg = await planBox(page);
  const base = await baseAreaBounds(page);
  const margins = {
    left: base.x,
    top: base.y,
    right: svg.width - (base.x + base.width),
    bottom: svg.height - (base.y + base.height),
  };
  expect(margins.left).toBeGreaterThanOrEqual(20);
  expect(margins.top).toBeGreaterThanOrEqual(20);
  expect(margins.right).toBeGreaterThanOrEqual(20);
  expect(margins.bottom).toBeGreaterThanOrEqual(20);

  // ... and it is the *fitted* plan: the constraining axis uses the fit margin (this is what a placeholder
  // viewport of `MIN_SCALE` would fail).
  expect(Math.min(margins.left, margins.top, margins.right, margins.bottom)).toBeGreaterThanOrEqual(FIT_MARGIN_PX - 1);
  expect(Math.min(margins.left, margins.top, margins.right, margins.bottom)).toBeLessThanOrEqual(FIT_MARGIN_PX + 1);

  // AC-2: a usable scale, and the 10 x 6 m base area is drawn with its own aspect ratio (no distortion).
  const scale = await planScale(page);
  expect(scale).toBeGreaterThanOrEqual(10);
  expect(scale).toBeLessThanOrEqual(500);
  expect(base.width / base.height).toBeCloseTo(10 / 6, 2);
});

test('zooms with the wheel around the cursor', async ({ page }) => {
  const box = await planBox(page);
  const centre = { x: box.width / 2, y: box.height / 2 };
  const scaleBefore = await planScale(page);
  const boundsBefore = await baseAreaBounds(page);

  await moveToPlanPoint(page, centre);
  await page.mouse.wheel(0, WHEEL_STEP);

  // AC-3: the scale and the drawn width grow by the wheel factor.
  const scaleAfter = await planScale(page);
  const boundsAfter = await baseAreaBounds(page);
  expect(scaleAfter / scaleBefore).toBeGreaterThan(ZOOM_FACTOR * 0.99);
  expect(scaleAfter / scaleBefore).toBeLessThan(ZOOM_FACTOR * 1.01);
  expect(boundsAfter.width / boundsBefore.width).toBeGreaterThan(ZOOM_FACTOR * 0.99);
  expect(boundsAfter.width / boundsBefore.width).toBeLessThan(ZOOM_FACTOR * 1.01);

  // AC-3 reversed: a wheel down of the same size undoes the step above.
  await page.mouse.wheel(0, -WHEEL_STEP);
  expect((await planScale(page)) / scaleBefore).toBeCloseTo(1, 2);
  const backToStart = await baseAreaBounds(page);
  expect(Math.abs(backToStart.x - boundsBefore.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(backToStart.y - boundsBefore.y)).toBeLessThanOrEqual(1);
});

test('keeps the point under the cursor while zooming', async ({ page }) => {
  // AC-4 needs a cursor position that stays on the plan for the whole test: as the base area grows by e^0.6 per
  // step, its corners move off the canvas after one zoom around the centre, and a mouse position outside the SVG
  // would send the wheel to the page instead of the plan. Its lower-right corner is the one that stays inside.
  const corner = await baseAreaCorner(page, -2);
  const scaleBefore = await planScale(page);
  await moveToPlanPoint(page, corner);
  await page.mouse.wheel(0, WHEEL_STEP);

  // the zoom really happened — the cursor did not simply pin the corner by pinning the whole viewport
  expect(await planScale(page)).toBeGreaterThan(scaleBefore);

  const cornerAfter = await baseAreaCorner(page, -2);
  expect(Math.abs(cornerAfter.x - corner.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(cornerAfter.y - corner.y)).toBeLessThanOrEqual(1);
});

test('pans with a drag on the background', async ({ page }) => {
  const scaleBefore = await planScale(page);
  const boundsBefore = await baseAreaBounds(page);

  // AC-5: a corner far from the base area starts a background drag (the base area itself is not draggable yet).
  const from: Vec = { x: 20, y: 20 };
  await moveToPlanPoint(page, from);
  await page.mouse.down();
  await moveToPlanPoint(page, { x: from.x + 100, y: from.y + 50 });
  await page.mouse.up();

  const boundsAfter = await baseAreaBounds(page);
  expect(Math.abs(boundsAfter.x - boundsBefore.x - 100)).toBeLessThanOrEqual(1);
  expect(Math.abs(boundsAfter.y - boundsBefore.y - 50)).toBeLessThanOrEqual(1);
  expect(await planScale(page)).toBe(scaleBefore);
});

test('restores the fitted view with the Fit button', async ({ page }) => {
  const box = await planBox(page);
  const scaleBefore = await planScale(page);
  const boundsBefore = await baseAreaBounds(page);

  await moveToPlanPoint(page, { x: box.width / 2, y: box.height / 2 });
  await page.mouse.wheel(0, WHEEL_STEP);
  await page.mouse.wheel(0, WHEEL_STEP);
  await moveToPlanPoint(page, { x: 20, y: 20 });
  await page.mouse.down();
  await moveToPlanPoint(page, { x: 120, y: 90 });
  await page.mouse.up();
  expect(await planScale(page)).not.toBeCloseTo(scaleBefore, 2);

  // AC-6: Fit returns to the initial view, both the scale and the drawn geometry.
  await page.getByRole('button', { name: 'Fit plan to view' }).click();
  expect(await planScale(page)).toBeCloseTo(scaleBefore, 3);
  const boundsAfter = await baseAreaBounds(page);
  expect(Math.abs(boundsAfter.x - boundsBefore.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(boundsAfter.y - boundsBefore.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(boundsAfter.width - boundsBefore.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(boundsAfter.height - boundsBefore.height)).toBeLessThanOrEqual(1);
});

test('labels the scale bar with the length it draws', async ({ page }) => {
  const initialLabel = await page.getByTestId('scale-bar-label').textContent();
  const initialBar = await scaleBarEnds(page);
  const initialPixels = initialBar.y - initialBar.x;
  // AC-7: the drawn bar never exceeds its budget, and the label is the bar's real length in metres (D2).
  expect(initialPixels).toBeLessThanOrEqual(150);
  expect(initialLabel).toBe(formatLength(initialPixels / (await planScale(page)), 'm'));

  const box = await planBox(page);
  await moveToPlanPoint(page, { x: box.width / 2, y: box.height / 2 });
  for (let step = 0; step < 3; step += 1) await page.mouse.wheel(0, WHEEL_STEP);

  const zoomedLabel = await page.getByTestId('scale-bar-label').textContent();
  const zoomedBar = await scaleBarEnds(page);
  const zoomedPixels = zoomedBar.y - zoomedBar.x;
  expect(zoomedPixels).toBeLessThanOrEqual(150);
  expect(zoomedLabel).toBe(formatLength(zoomedPixels / (await planScale(page)), 'm'));
  expect(zoomedLabel).not.toBe(initialLabel);
});

test('stays usable on a 320 px wide screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  // let the ResizeObserver report the new canvas before the layout assertions
  await expect(page.getByTestId('base-area')).toBeVisible();

  // AC-8: no horizontal page scrollbar, the plan is still there and Fit can still be clicked.
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement;
    return el ? { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth } : null;
  });
  expect(overflow).not.toBeNull();
  expect(overflow!.scrollWidth).toBeLessThanOrEqual(overflow!.clientWidth);

  await expect(page.getByTestId('plan-svg')).toBeVisible();
  await expect(page.getByTestId('base-area')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Garden Planner' })).toBeVisible();
  const fit = page.getByRole('button', { name: 'Fit plan to view' });
  await expect(fit).toBeVisible();
  await expect(fit).toBeEnabled();
  const fitBox = await fit.boundingBox();
  if (!fitBox) throw new Error('the Fit button has no box');
  expect(fitBox.x).toBeGreaterThanOrEqual(0);
  expect(fitBox.x + fitBox.width).toBeLessThanOrEqual(320);
  expect(fitBox.y + fitBox.height).toBeLessThanOrEqual(640);
});
