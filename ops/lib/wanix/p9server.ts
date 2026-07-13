import path from 'node:path'

import { WANIX_FIXTURES_DIR } from 'ops/lib/fixturepaths'

/** Absolute path to the local WSS 9P fixture package. */
export const WANIX_P9SERVER_DIR = path.join(WANIX_FIXTURES_DIR, 'p9server')

/**
 * Start the fixture via `go run` (caller manages lifecycle).
 * Prefer Go tests in `ops/fixtures/wanix/p9server` for smoke;
 * this helper is for Node integration if needed.
 */
export function wanixp9servergorunargs(dir: string): string[] {
  return [
    'run',
    './p9server/cmd',
    '-dir',
    dir,
  ]
}
