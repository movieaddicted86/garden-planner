/**
 * Drawing zones on the plan: the zone panel, the list with live figures, validity and warnings.
 *
 * Coordinates: the SVG has no `viewBox` and fills its wrapper, so one SVG user unit is one CSS pixel, and the
 * `points` attribute of a drawn polygon is its position relative to the SVG's top-left corner. `clickAt` turns a
 * world point (metres) into a screen position through the base-area polygon, which is the fitted 10 x 6 m garden:
 * the base area is the whole reference frame, so the spec never needs to know the viewport scale.
 */
import { expect, test, type Page } from '@playwright/test';

/** The demo base area the app starts with (`plan-store.ts`): 10 m wide, which `screenOf` measures against. */
const BASE_WIDTH_M = 10;

/** The tolerance AC-2 gives the figures, in metres / square metres. */
const FIGURE_TOLERANCE = 0.15;

/** Console and page errors of the running test; AC-9. */
const pageErrors: string[] = [];

/** A point in SVG coordinates (CSS pixels, origin at the SVG's top-left corner). */
interface Vec {
  readonly x: number;
  readonly y: number;
}

/** The zones of AC-2, AC-3 and AC-5: a 3 x 2 m bed (6 m², 10 m) and a bow tie. */
const BED_CORNERS: readonly Vec[] = [
  { x: 1, y: 1 },
  { x: 4, y: 1 },
  { x: 4, y: 3 },
  { x: 1, y: 3 },
];
const BOW_TIE_CORNERS: readonly Vec[] = [
  { x: 1, y: 1 },
  { x: 3, y: 3 },
  { x: 3, y: 1 },
  { x: 1, y: 3 },
];

/** The SVG's box on the page, so SVG coordinates can be turned into a mouse position. */
async function planBox(page: Page) {
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

/**
 * The screen position of the world point `(wx, wy)`, computed from the drawn base area: the store's rectangle runs
 * `(0,0) → (10,0) → (10,6) → (0,6)`, so `points[0]` is the world origin and the drawn width is the scale.
 */
async function screenOf(page: Page, wx: number, wy: number): Promise<Vec> {
  const [origin] = await baseAreaPoints(page);
  const box = await planBox(page);
  const scale = ((await baseAreaPoints(page))[1].x - origin.x) / BASE_WIDTH_M;
  return { x: box.x + origin.x + wx * scale, y: box.y + origin.y + wy * scale };
}

/** Clicks the world point `(wx, wy)` on the plan. */
async function clickAt(page: Page, wx: number, wy: number): Promise<void> {
  const point = await screenOf(page, wx, wy);
  await page.mouse.click(point.x, point.y);
}

/** Clicks every corner of `corners` in order, as the user draws a zone. */
async function clickCorners(page: Page, corners: readonly Vec[]): Promise<void> {
  for (const corner of corners) await clickAt(page, corner.x, corner.y);
}

/** Drags from one world point to another, far enough that it is a pan and not a click (AC-3). */
async function dragFromTo(page: Page, from: Vec, to: Vec): Promise<void> {
  const start = await screenOf(page, from.x, from.y);
  const end = await screenOf(page, to.x, to.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // two moves: the first leaves the 4 px radius, the second reaches the target
  await page.mouse.move(start.x + 20, start.y + 20);
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();
}

/**
 * Zooms out `steps` wheel steps around the middle of the plan, so world points beyond the base area come into
 * view. The fit shows the base area alone (T-008), so a zone that reaches outside it is partly off the canvas
 * until the view is wide enough.
 */
async function zoomOut(page: Page, steps: number): Promise<void> {
  const box = await planBox(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let step = 0; step < steps; step += 1) await page.mouse.wheel(0, 300);
}

/** The zone list entries. */
const zoneItems = (page: Page) => page.getByTestId('zone-item');
const zonePolygons = (page: Page) => page.getByTestId('zone-polygon');

/** Starts drawing a zone of `type` through the panel. */
async function startDrawing(page: Page, type: string): Promise<void> {
  await page.getByTestId('zone-type').selectOption(type);
  await page.getByTestId('zone-start').click();
  await expect(page.getByTestId('zone-draw-hint')).toBeVisible();
}

/** The parsed number of a figure text like `6.00 m²` or `10.00 m`, so the two can be compared as numbers. */
function numberOf(text: string | null): number {
  if (text === null) throw new Error('the figure has no text');
  const match = /-?\d+(?:[.,]\d+)?/.exec(text);
  if (!match) throw new Error(`no number in ${JSON.stringify(text)}`);
  return Number(match[0].replace(',', '.'));
}

/** The page's horizontal overflow, which AC-9 requires to be zero. */
async function horizontalOverflow(page: Page): Promise<{ scrollWidth: number; clientWidth: number }> {
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement;
    return el ? { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth } : null;
  });
  if (!overflow) throw new Error('the page has no scrolling element');
  return overflow;
}

test.beforeEach(async ({ page }) => {
  pageErrors.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  // the plan is drawn after the first canvas measurement, so this waits for the fitted, settled view
  await expect(page.getByTestId('base-area')).toBeVisible();
});

test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

test('AC-2: draws a bed, lists it with its live figures and shows it on the plan', async ({ page }) => {
  await startDrawing(page, 'bed');

  // the Finish button needs a polygon: disabled after two corners, enabled from the third (D3)
  await clickAt(page, 1, 1);
  await expect(page.getByTestId('zone-point-count')).toHaveText('1 point');
  await clickAt(page, 4, 1);
  await expect(page.getByTestId('zone-point-count')).toHaveText('2 points');
  await expect(page.getByTestId('zone-finish')).toBeDisabled();

  await clickAt(page, 4, 3);
  await expect(page.getByTestId('zone-finish')).toBeEnabled();
  await clickAt(page, 1, 3);
  await page.getByTestId('zone-finish').click();

  // the draft is gone, the zone is in the list and on the plan
  await expect(page.getByTestId('zone-draft')).toHaveCount(0);
  await expect(page.getByTestId('zone-draw-hint')).toHaveCount(0);
  await expect(zoneItems(page)).toHaveCount(1);
  await expect(page.getByTestId('zone-name')).toHaveText('Bed 1');
  await expect(page.getByTestId('zone-type-label')).toHaveText('Bed');
  await expect(zonePolygons(page)).toHaveCount(1);

  // 3 x 2 m is 6 m² and 2 * (3 + 2) = 10 m; the click lands within a pixel of the corner, hence the tolerance
  expect(Math.abs(numberOf(await page.getByTestId('zone-area').textContent()) - 6)).toBeLessThanOrEqual(FIGURE_TOLERANCE);
  expect(Math.abs(numberOf(await page.getByTestId('zone-perimeter').textContent()) - 10)).toBeLessThanOrEqual(FIGURE_TOLERANCE);
  await expect(page.getByTestId('zone-area')).toHaveText(/m²$/);
  await expect(page.getByTestId('zone-invalid')).toHaveCount(0);
  await expect(page.getByTestId('zone-warnings')).toHaveCount(0);
});

test('AC-3: a drag in drawing mode pans and adds no point, a click adds one', async ({ page }) => {
  await startDrawing(page, 'bed');
  const before = await baseAreaPoints(page);

  // drag on the background: more than 4 px, so it is a pan (the base area moves) and not a corner
  await dragFromTo(page, { x: 0.5, y: 0.5 }, { x: 2, y: 1.5 });

  const after = await baseAreaPoints(page);
  expect(Math.abs(after[0].x - before[0].x)).toBeGreaterThan(4);
  // the drag is a pan, so the draft is still empty — the count only appears once a corner exists
  await expect(page.getByTestId('zone-point-count')).toHaveText('0 points');

  // a click with no movement at all is a corner
  await clickAt(page, 2, 2);
  await expect(page.getByTestId('zone-point-count')).toHaveText('1 point');
  await expect(page.getByTestId('zone-draft')).toHaveAttribute('data-point-count', '1');
});

test('AC-4: Escape cancels, Backspace removes the last corner, Enter finishes', async ({ page }) => {
  // Escape drops the whole draft and leaves no zone
  await startDrawing(page, 'bed');
  await clickCorners(page, BED_CORNERS);
  await expect(page.getByTestId('zone-point-count')).toHaveText('4 points');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('zone-draw-hint')).toHaveCount(0);
  await expect(page.getByTestId('zone-draft')).toHaveCount(0);
  await expect(zoneItems(page)).toHaveCount(0);

  // Backspace takes one corner back
  await startDrawing(page, 'bed');
  await clickCorners(page, BED_CORNERS);
  await page.keyboard.press('Backspace');
  await expect(page.getByTestId('zone-point-count')).toHaveText('3 points');
  await expect(page.getByTestId('zone-draft')).toHaveAttribute('data-point-count', '3');

  // Enter finishes the draft that is left
  await page.keyboard.press('Enter');
  await expect(zoneItems(page)).toHaveCount(1);
  await expect(page.getByTestId('zone-name')).toHaveText('Bed 1');
  // the remaining three corners are 1,1 4,1 4,3: area 3 m², perimeter 3 + 2 + sqrt(9+4) = 8.61 m
  expect(Math.abs(numberOf(await page.getByTestId('zone-area').textContent()) - 3)).toBeLessThanOrEqual(FIGURE_TOLERANCE);
});

test('AC-4: Escape off a draft clears the selection instead of leaving it stuck', async ({ page }) => {
  await startDrawing(page, 'bed');
  await clickCorners(page, BED_CORNERS);
  await page.getByTestId('zone-finish').click();
  await expect(page.getByTestId('zone-item')).toHaveAttribute('aria-current', 'true');

  await page.keyboard.press('Escape');

  await expect(page.getByTestId('zone-item')).not.toHaveAttribute('aria-current', 'true');
});

test('AC-5: a bow tie is accepted, marked invalid, without figures and with a red dashed outline', async ({ page }) => {
  await startDrawing(page, 'bed');
  await clickCorners(page, BOW_TIE_CORNERS);
  await page.getByTestId('zone-finish').click();

  // the zone is stored and listed: an invalid outline is not refused (D5)
  await expect(zoneItems(page)).toHaveCount(1);
  await expect(page.getByTestId('zone-invalid')).toHaveText('Invalid: crosses itself');
  // no figures are shown as valid — the placeholder stands instead
  await expect(page.getByTestId('zone-area')).toHaveText('–');
  await expect(page.getByTestId('zone-perimeter')).toHaveText('–');

  // and the plan carries the same verdict
  const polygon = zonePolygons(page);
  await expect(polygon).toHaveAttribute('data-invalid', 'true');
  await expect(polygon).toHaveCSS('stroke-dasharray', /^\d/);
  const stroke = await polygon.evaluate((element) => getComputedStyle(element).stroke);
  expect(stroke).toBe('rgb(179, 38, 30)');
});

test('AC-6: warnings name the zones and disappear when the cause is deleted', async ({ page }) => {
  // with one valid zone there is nothing to warn about: the list is not in the DOM at all
  await startDrawing(page, 'bed');
  await clickCorners(page, BED_CORNERS);
  await page.getByTestId('zone-finish').click();
  await expect(page.getByTestId('zone-warnings')).toHaveCount(0);

  // a path overlapping the bed: `findZoneWarnings` names the pair in project order, so the bed comes first
  await startDrawing(page, 'path');
  await clickCorners(page, [
    { x: 2, y: 2 },
    { x: 5, y: 2 },
    { x: 5, y: 4 },
    { x: 2, y: 4 },
  ]);
  await page.getByTestId('zone-finish').click();

  await expect(page.getByTestId('zone-warnings')).toBeVisible();
  await expect(page.getByTestId('zone-warning')).toHaveText(['Bed 1 overlaps Path 1']);

  // a zone reaching beyond the base area (x up to 12 m) is a warning too, in zone order after the overlap. The fit
  // shows the base area alone, so the view is zoomed out first — otherwise the corner at x = 12 is off the canvas.
  await zoomOut(page, 2);
  await startDrawing(page, 'lawn');
  await clickCorners(page, [
    { x: 8, y: 1 },
    { x: 12, y: 1 },
    { x: 12, y: 2 },
    { x: 8, y: 2 },
  ]);
  await page.getByTestId('zone-finish').click();

  // `findZoneWarnings` lists the zones that leave the base area first, then the overlapping pairs (its documented
  // order), so the lawn comes before the overlap even though the path was drawn first
  await expect(page.getByTestId('zone-warning')).toHaveText(['Lawn 1 is outside the base area', 'Bed 1 overlaps Path 1']);

  // deleting the zone that leaves the base area takes its warning with it
  await page.getByTestId('zone-item').filter({ hasText: 'Lawn 1' }).getByTestId('zone-delete').click();

  await expect(page.getByTestId('zone-warning')).toHaveText(['Bed 1 overlaps Path 1']);

  // and deleting the overlapping path leaves nothing to warn about
  await page.getByTestId('zone-item').filter({ hasText: 'Path 1' }).getByTestId('zone-delete').click();

  await expect(page.getByTestId('zone-warnings')).toHaveCount(0);
});

test('AC-7: the type select names the next zone and the unit toggle reaches the perimeter', async ({ page }) => {
  await startDrawing(page, 'gravel');
  await clickCorners(page, BED_CORNERS);
  await page.getByTestId('zone-finish').click();

  await expect(page.getByTestId('zone-name')).toHaveText('Gravel 1');
  await expect(page.getByTestId('zone-type-label')).toHaveText('Gravel');
  await expect(page.getByTestId('zone-perimeter')).toHaveText('10.00 m');

  // the unit toggle applies to the zone list too (D2): the stored metres do not change
  await page.getByRole('radio', { name: 'cm', exact: true }).check();

  await expect(page.getByTestId('zone-perimeter')).toHaveText('1000 cm');
  // the area is always m², whatever the length unit is
  await expect(page.getByTestId('zone-area')).toHaveText('6.00 m²');
});

test('AC-8: selecting an item marks it and its polygon, Delete removes both', async ({ page }) => {
  await startDrawing(page, 'bed');
  await clickCorners(page, BED_CORNERS);
  await page.getByTestId('zone-finish').click();
  await startDrawing(page, 'patio');
  await clickCorners(page, [
    { x: 6, y: 1 },
    { x: 9, y: 1 },
    { x: 9, y: 2 },
    { x: 6, y: 2 },
  ]);
  await page.getByTestId('zone-finish').click();
  await expect(zoneItems(page)).toHaveCount(2);

  // the second zone is selected from being drawn; selecting the first moves both the list and the plan
  const bed = page.getByTestId('zone-item').filter({ hasText: 'Bed 1' });
  await bed.getByTestId('zone-select').click();

  await expect(bed).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('zone-item').filter({ hasText: 'Patio 1' })).not.toHaveAttribute('aria-current', 'true');

  const bedPolygon = page.locator('[data-testid="zone-polygon"][data-selected="true"]');
  await expect(bedPolygon).toHaveCount(1);
  await expect(bedPolygon).toHaveClass(/plan-zone-selected/);
  const bedPoints = await bedPolygon.getAttribute('points');
  expect(bedPoints).not.toBeNull();

  // Delete removes the zone, its polygon and its selection
  await bed.getByTestId('zone-delete').click();

  await expect(zoneItems(page)).toHaveCount(1);
  await expect(zonePolygons(page)).toHaveCount(1);
  await expect(page.getByTestId('zone-name')).toHaveText('Patio 1');
  await expect(page.locator('[data-selected="true"]')).toHaveCount(0);
});

test('AC-8: the Delete button is named after its zone', async ({ page }) => {
  await startDrawing(page, 'tree_pit');
  await clickCorners(page, BED_CORNERS);
  await page.getByTestId('zone-finish').click();

  await expect(page.getByRole('button', { name: 'Delete Tree pit 1' })).toBeVisible();
});

test('AC-9: stays usable at 320 x 640 without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(page.getByTestId('base-area')).toBeVisible();

  const overflow = await horizontalOverflow(page);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  // the zone panel is below the plan at this width, so it is reached by scrolling down; the controls have to be
  // usable there, not merely present
  const select = page.getByTestId('zone-type');
  await select.scrollIntoViewIfNeeded();
  await expect(select).toBeVisible();
  const box = await select.boundingBox();
  if (!box) throw new Error('the type select has no box');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);

  // Back to the plan to draw: the clicks go to page coordinates, so the SVG has to be in the viewport again.
  await page.getByTestId('plan-svg').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('base-area')).toBeVisible();

  // A resize keeps the viewport of the wider load (T-007), so the plan is clipped here; Fit shows it again.
  await page.getByRole('button', { name: 'Fit plan to view' }).click();

  // draw a zone at this width: the panel and the plan both work
  await startDrawing(page, 'bed');
  await clickCorners(page, BED_CORNERS);
  await page.getByTestId('zone-finish').click();

  await expect(zoneItems(page)).toHaveCount(1);
  await expect(page.getByTestId('zone-name')).toHaveText('Bed 1');

  // a zone reaching beyond the base area puts its warning into the panel; the long sentence must not widen the page
  await zoomOut(page, 2);
  await startDrawing(page, 'lawn');
  await clickCorners(page, [
    { x: 8, y: 1 },
    { x: 12, y: 1 },
    { x: 12, y: 2 },
    { x: 8, y: 2 },
  ]);
  await page.getByTestId('zone-finish').click();

  await expect(page.getByTestId('zone-warning')).toHaveText(['Lawn 1 is outside the base area']);
  const afterOverflow = await horizontalOverflow(page);
  expect(afterOverflow.scrollWidth).toBeLessThanOrEqual(afterOverflow.clientWidth);
});
