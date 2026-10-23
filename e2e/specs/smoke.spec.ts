import { expect, test } from '@playwright/test';

test('the app loads and shows its name', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await expect(page).toHaveTitle('Garden Planner');
  await expect(page.getByRole('heading', { name: 'Garden Planner' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the API is reachable through the same origin', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBe(true);
  expect(await res.json()).toMatchObject({ status: 'ok' });
});
