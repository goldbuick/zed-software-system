import { defineConfig, devices } from '@playwright/test'

const allbrowsers = process.env.PLAYWRIGHT_ALL_BROWSERS === '1'
const includegadgete2e = process.env.PLAYWRIGHT_INCLUDE_GADGET_E2E === '1'

export default defineConfig({
  testDir: 'e2e',
  // Heavy gadget / inspect / scroll tests: opt in with PLAYWRIGHT_INCLUDE_GADGET_E2E=1 or yarn test:e2e:gadget-scroll
  testIgnore: includegadgete2e ? [] : ['**/gadget-inspect-scroll.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:7777',
    launchOptions: {
      args: ['--ignore-gpu-blocklist'],
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
    command: 'ZSS_NO_HTTPS=1 yarn dev:vite',
    url: 'http://127.0.0.1:7777',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
