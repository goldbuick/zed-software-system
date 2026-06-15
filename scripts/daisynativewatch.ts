import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
export const DAISY_NATIVE_DIR = path.join(
  ROOT,
  '..',
  'zss/feature/synth/backend/daisy/native',
)

export const DAISY_WATCH_POLL_MS = 2000
export const DAISY_WATCH_DEBOUNCE_MS = 1000

/** Latest mtime of project native sources (excludes vendored DaisySP trees). */
export function daisynativemtime(): number {
  let max = 0
  function walk(dir: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        ent.name === 'DaisySP' ||
        ent.name === 'DaisySP-LGPL' ||
        ent.name === 'submodules'
      ) {
        continue
      }
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        walk(p)
      } else if (/\.(cpp|h)$/.test(ent.name)) {
        max = Math.max(max, fs.statSync(p).mtimeMs)
      }
    }
  }
  walk(DAISY_NATIVE_DIR)
  return max
}
