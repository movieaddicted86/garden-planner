/**
 * The base-area panel: unit toggle, rectangle form and the live area/perimeter figures.
 *
 * The figures are read from the panel (`base-area-area`, `base-area-perimeter`), the geometry from the drawn
 * polygon's `points` attribute — the SVG has no `viewBox`, so one user unit is one CSS pixel and the attribute is
 * the screen position. The zoom is uniform, so a ratio of the drawn bounding box is the rectangle's own ratio.
 */
import { expect, test, type Page } from '@playwright/test';

/** The demo garden the app starts with (`plan-store.ts`): the sizes AC-3 expects to read in metres. */
const INITIAL_WIDTH_M = 10;
const INITIAL_HEIGHT_M = 6;

/** The size AC-5 applies, typed with a decimal comma the way a German keyboard produces it. */
const APPLIED_WIDTH_M = 12.5;
const APPLIED_HEIGHT_M = 6;

/** The one message a field shows when its text is not a usable side (AC-7). */
const SIDE_ERROR = 'Enter a number greater than 0 and at most 1000 m';

/** Console and page errors of the running test; AC-9. */
const pageErrors: string[] = [];

/** The panel's controls, looked up the way a user reaches them: by label, role or test id. */
const widthInput = (page: Page) => page.getByTestId('base-area-width');
const heightInput = (page: Page) => page.getByTestId('base-area-height');
const applyButton = (page: Page) => page.getByTestId('base-area-apply');
const unitRadio = (page: Page, unit: 'm' | 'cm') => page.getByRole('radio', { name: unit, exact: true });

/** The base area's vertices in SVG coordinates, in the order the app drew them. */
async function baseAreaPoints(page: Page): Promise<{ x: number; y: number }[]> {
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

/** The width / height ratio of the drawn base area, so a stored size can be recognised in the plan. */
async function baseAreaAspectRatio(page: Page): Promise<number> {
  const points = await baseAreaPoints(page);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
}

/** The page's horizontal overflow, which AC-8 requires to be zero. */
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

test('AC-3: shows the stored size, the figures and the unit in force', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Base area' })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Unit' })).toBeVisible();
  await expect(unitRadio(page, 'm')).toBeChecked();
  await expect(unitRadio(page, 'cm')).not.toBeChecked();

  await expect(widthInput(page)).toHaveValue('10.00');
  await expect(heightInput(page)).toHaveValue('6.00');
  await expect(page.getByTestId('base-area-area')).toHaveText('60.00 m²');
  await expect(page.getByTestId('base-area-perimeter')).toHaveText('32.00 m');

  await expect(applyButton(page)).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);

  // the drawn plan is the rectangle of the fields: 10 x 6, whatever zoom the fit chose
  expect(await baseAreaAspectRatio(page)).toBeCloseTo(INITIAL_WIDTH_M / INITIAL_HEIGHT_M, 2);
});

test('AC-4: switching to cm re-reads every value and switching back does not drift (D2)', async ({ page }) => {
  const pointsBefore = await page.getByTestId('base-area').getAttribute('points');
  const areaBefore = await page.getByTestId('base-area-area').textContent();

  await unitRadio(page, 'cm').check();

  await expect(widthInput(page)).toHaveValue('1000');
  await expect(heightInput(page)).toHaveValue('600');
  // the area is always m² (D2), the perimeter follows the display unit
  await expect(page.getByTestId('base-area-area')).toHaveText('60.00 m²');
  await expect(page.getByTestId('base-area-area')).toHaveText(areaBefore ?? '');
  await expect(page.getByTestId('base-area-perimeter')).toHaveText('3200 cm');
  await expect(page.getByTestId('scale-bar-label')).toHaveText(/cm$/);

  // the unit is a reading of the same plan: nothing was converted on the way in (AC-4)
  await expect(page.getByTestId('base-area')).toHaveAttribute('points', pointsBefore ?? '');

  await unitRadio(page, 'm').check();

  await expect(widthInput(page)).toHaveValue('10.00');
  await expect(heightInput(page)).toHaveValue('6.00');
  await expect(page.getByTestId('base-area-perimeter')).toHaveText('32.00 m');
  await expect(page.getByTestId('scale-bar-label')).toHaveText(/ m$/);
  await expect(page.getByTestId('base-area')).toHaveAttribute('points', pointsBefore ?? '');
});

test('AC-4: a unit switch drops a half-typed value', async ({ page }) => {
  await widthInput(page).fill('123');

  await unitRadio(page, 'cm').check();

  // the draft belonged to the old unit, so the field shows the stored size in the new one
  await expect(widthInput(page)).toHaveValue('1000');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('AC-5: applies a size typed in metres with a decimal comma', async ({ page }) => {
  const pointsBefore = await page.getByTestId('base-area').getAttribute('points');

  await widthInput(page).fill('12,5');
  await heightInput(page).fill('6');
  await expect(applyButton(page)).toBeEnabled();
  // typing alone does not change the plan: only Apply does
  await expect(page.getByTestId('base-area')).toHaveAttribute('points', pointsBefore ?? '');

  await applyButton(page).click();

  await expect(page.getByTestId('base-area-area')).toHaveText('75.00 m²');
  await expect(page.getByTestId('base-area-perimeter')).toHaveText('37.00 m');
  // the fields come back from the store, rounded to the display decimals of the unit
  await expect(widthInput(page)).toHaveValue('12.50');
  await expect(heightInput(page)).toHaveValue('6.00');

  // the plan really has the new shape, not just the figures
  const ratio = await baseAreaAspectRatio(page);
  expect(ratio).toBeGreaterThan(APPLIED_WIDTH_M / APPLIED_HEIGHT_M - 0.01);
  expect(ratio).toBeLessThan(APPLIED_WIDTH_M / APPLIED_HEIGHT_M + 0.01);
});

test('AC-6: applies a size typed in centimetres', async ({ page }) => {
  await unitRadio(page, 'cm').check();
  await widthInput(page).fill('800');
  await heightInput(page).fill('500');
  await applyButton(page).click();

  await expect(page.getByTestId('base-area-area')).toHaveText('40.00 m²');
  await expect(page.getByTestId('base-area-perimeter')).toHaveText('2600 cm');
  await expect(widthInput(page)).toHaveValue('800');

  await unitRadio(page, 'm').check();

  await expect(widthInput(page)).toHaveValue('8.00');
  await expect(heightInput(page)).toHaveValue('5.00');
  await expect(page.getByTestId('base-area-area')).toHaveText('40.00 m²');
  await expect(page.getByTestId('base-area-perimeter')).toHaveText('26.00 m');
});

test('AC-7: refuses a size that is not a usable length, in metres', async ({ page }) => {
  const pointsBefore = await page.getByTestId('base-area').getAttribute('points');
  const widthError = page.getByTestId('base-area-width-error');

  // 'abc' is unreadable, the empty field has no number, 0 and -3 are not a size, 1001 m is beyond the limit
  for (const text of ['abc', '', '0', '-3', '1001']) {
    await widthInput(page).fill(text);

    await expect(widthError).toBeVisible();
    await expect(widthError).toHaveText(SIDE_ERROR);
    await expect(widthError).toHaveAttribute('role', 'alert');
    await expect(widthInput(page)).toHaveAttribute('aria-invalid', 'true');
    await expect(applyButton(page)).toBeDisabled();
  }

  // a value that is out of range never reaches the plan, however often Apply is pressed
  await expect(page.getByTestId('base-area')).toHaveAttribute('points', pointsBefore ?? '');

  await widthInput(page).fill('7');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(widthInput(page)).toHaveAttribute('aria-invalid', 'false');
  await expect(applyButton(page)).toBeEnabled();

  // the height field judges its own text and carries its own message
  const heightError = page.getByTestId('base-area-height-error');
  await heightInput(page).fill('0');
  await expect(heightError).toHaveText(SIDE_ERROR);
  await expect(heightInput(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(applyButton(page)).toBeDisabled();
  await heightInput(page).fill('4');
  await expect(applyButton(page)).toBeEnabled();
});

test('AC-7: judges the limit in metres, whatever unit is typed in', async ({ page }) => {
  await unitRadio(page, 'cm').check();

  // 1001 cm is 10.01 m, well inside the 1000 m limit, so it is valid; 100001 cm is not
  await widthInput(page).fill('1001');
  await expect(applyButton(page)).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);

  await widthInput(page).fill('100001');
  await expect(page.getByTestId('base-area-width-error')).toHaveText(SIDE_ERROR);
  await expect(applyButton(page)).toBeDisabled();
});

test('AC-8: stays usable at 320 x 640 without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(page.getByTestId('base-area')).toBeVisible();

  const overflow = await horizontalOverflow(page);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  // The panel is below the plan at this width, so it is reached by scrolling down the page. It may fit into the
  // 640 px already; what must not happen is that the shell clips it (which is what `height: 100%` would do), so
  // the assertion is that the button can be brought inside the viewport, not that scrolling was necessary.
  const apply = applyButton(page);
  await apply.scrollIntoViewIfNeeded();
  await expect(apply).toBeVisible();
  const applyBox = await apply.boundingBox();
  if (!applyBox) throw new Error('the Apply button has no box');
  expect(applyBox.y).toBeGreaterThanOrEqual(0);
  expect(applyBox.y + applyBox.height).toBeLessThanOrEqual(640);
  expect(applyBox.x).toBeGreaterThanOrEqual(0);
  expect(applyBox.x + applyBox.width).toBeLessThanOrEqual(320);

  // every control still works: type a size, apply it, switch the unit, read the figures
  await widthInput(page).fill('8');
  await heightInput(page).fill('5');
  await apply.click();
  await expect(page.getByTestId('base-area-area')).toHaveText('40.00 m²');
  await expect(page.getByTestId('base-area-perimeter')).toHaveText('26.00 m');

  await unitRadio(page, 'cm').check();
  await expect(page.getByTestId('base-area-perimeter')).toHaveText('2600 cm');
  await expect(widthInput(page)).toHaveValue('800');

  // the longer values in the fields (and an invalid one) must not widen the page either
  await widthInput(page).fill('100001');
  await expect(page.getByTestId('base-area-width-error')).toBeVisible();
  const afterOverflow = await horizontalOverflow(page);
  expect(afterOverflow.scrollWidth).toBeLessThanOrEqual(afterOverflow.clientWidth);
});
