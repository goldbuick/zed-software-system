/**
 * Shared Playwright launch options for wanix harness validators.
 */
export function readplaywrightheadless() {
  return process.env.ZSS_PLAYWRIGHT_HEADLESS === '1'
}
