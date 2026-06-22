# Playwright e2e (removed)

Browser e2e specs that depended on `window.__zss_e2e` in the app were removed.
Future e2e should live here with harness HTML under `ops/fixtures/harness/` only —
no instrumentation in `cafe/` or `zss/feature/`.

Daisy parity tasks still use Playwright via `tasks/lib/parity/parity-playwright.ts`
(calibration only, not product runtime).
