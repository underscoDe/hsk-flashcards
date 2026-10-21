import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: '__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // The service worker would serve cached files around page.route(); offline.spec.js turns it on
    serviceWorkers: 'block',
    // The app follows the device language: tests run in English unless they set another one
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chrome',
      // Uses the installed Google Chrome; set PW_CHANNEL=chromium after `npx playwright install chromium` otherwise
      // Phone-sized by default (the main target); desktop.spec.js sets a desktop viewport
      use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL ?? 'chrome', viewport: { width: 412, height: 915 } },
    },
  ],
  // Same static server as local development; the app has no build step
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    stderr: 'ignore', // python's request log
  },
});
