import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', timeout: 90000,
  expect: { timeout: 15000 }, workers: 1,
  use: { baseURL: 'http://localhost:3100', browserName: 'chromium', channel: 'msedge', headless: true, viewport: { width: 1440, height: 1050 } },
});
