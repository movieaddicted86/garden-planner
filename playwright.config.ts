/**
 * End-to-end suite: runs against the built app served by the real server with a throw-away `DATA_DIR`,
 * so it never touches real projects. Run `npm run build` first.
 */
import { defineConfig } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node server/dist/index.js',
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    env: { PORT: String(port), DATA_DIR: './test-results/e2e-data', WEB_DIST: './web/dist' },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
