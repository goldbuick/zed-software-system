/** Delegates to run-daisy-parity-loop.ts — prefer `yarn notepop:loop`. */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const extra = process.argv.slice(2)
const result = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    path.join(root, 'run-daisy-parity-loop.ts'),
    '--suite',
    'notepop',
    ...extra,
  ],
  { stdio: 'inherit', cwd: path.join(root, '..') },
)
process.exit(result.status ?? 1)
