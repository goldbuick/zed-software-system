import { defineConfig, devices } from '@playwright/test'

const allbrowsers = process.env.PLAYWRIGHT_ALL_BROWSERS === '1'
const includegadgete2e = process.env.PLAYWRIGHT_INCLUDE_GADGET_E2E === '1'
const includejoine2e = process.env.PLAYWRIGHT_INCLUDE_JOIN_E2E === '1'
const includelangbenche2e = process.env.PLAYWRIGHT_INCLUDE_LANG_BENCH === '1'

const testignore: string[] = []
if (!includegadgete2e) {
  testignore.push('**/gadget-inspect-scroll.spec.ts')
}
if (!includejoine2e) {
  testignore.push('**/join-boardrunner-move.spec.ts')
  testignore.push('**/join-gadget-charedit.spec.ts')
}
if (!includelangbenche2e) {
  testignore.push('**/lang-compile-bench.spec.ts')
}

/** Default per-test ceiling; specs may raise via test.describe.configure({ timeout }). */
const DEFAULT_TEST_TIMEOUT_MS = 120_000
/** Hard stop for the full playwright run (all projects/specs). */
const GLOBAL_RUN_TIMEOUT_MS = 900_000

export default defineConfig({
  testDir: 'e2e',
  // Gadget scroll: PLAYWRIGHT_INCLUDE_GADGET_E2E=1. Join multiplayer: PLAYWRIGHT_INCLUDE_JOIN_E2E=1.
  // Lang compile bench: PLAYWRIGHT_INCLUDE_LANG_BENCH=1.
  testIgnore: testignore.length ? testignore : [],
  timeout: DEFAULT_TEST_TIMEOUT_MS,
  globalTimeout: GLOBAL_RUN_TIMEOUT_MS,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:7777',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    launchOptions: {
      // Headless Chromium has no GPU WebGL by default; join UI needs Engine (R3F).
      args: [
        '--ignore-gpu-blocklist',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  // Default: Chromium only (faster local/CI). Set PLAYWRIGHT_ALL_BROWSERS=1 for firefox + webkit.
  projects: allbrowsers
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ]
    : [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'ZSS_NO_HTTPS=1 yarn vite:dev',
    url: 'http://127.0.0.1:7777',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
