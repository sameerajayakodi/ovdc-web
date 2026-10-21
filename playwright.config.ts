import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * End-to-end tests run against the production build (`next build && next start`)
 * using the locally installed Google Chrome — no browser download needed.
 */
export default defineConfig({
  testDir: "./e2e",
  // Lead tests write to the shared Neon database; these remove every row they create.
  globalSetup: "./e2e/global-cleanup.ts",
  globalTeardown: "./e2e/global-cleanup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    trace: "retain-on-failure",
    // Skip the cookie banner so it never covers the UI under test.
    storageState: {
      cookies: [],
      origins: [{ origin: `http://localhost:${PORT}`, localStorage: [{ name: "ovdc.cookies", value: "essential" }] }],
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } }, testIgnore: /(mobile|admin|content|sales|cms)\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" }, testMatch: /mobile\.spec\.ts/ },
    // Tests that edit what the website shows (unit status, projects, floor plans, tours, media)
    // invalidate its cached pages. Run them after the public-site tests, so no site test is
    // navigating while the page it is opening regenerates.
    {
      name: "writes",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } },
      testMatch: /(admin|content|sales|cms)\.spec\.ts/,
      dependencies: ["desktop", "mobile"],
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
