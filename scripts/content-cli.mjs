#!/usr/bin/env node
/**
 * Run content book CLI tasks through jest (memory modules need ts-jest resolution).
 *
 * Usage:
 *   node scripts/content-cli.mjs build fixtures/content/templates/minimal
 *   node scripts/content-cli.mjs validate fixtures/content/dist/minimal.book.json
 *   node scripts/content-cli.mjs codepage-validate fixtures/content/templates/minimal/pages/player.object.json
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLITEST = path.join(
  ROOT,
  'zss/feature/content/__tests__/contentbook.cli.test.ts',
)

const task = process.argv[2]
const arg = process.argv[3] ?? ''
const extra = process.argv.slice(4)

if (!task || !arg) {
  process.stderr.write(
    'usage: node scripts/content-cli.mjs <build|validate|codepage-validate> <path> [--out ...]\n',
  )
  process.exit(1)
}

const result = spawnSync(
  process.platform === 'win32' ? 'yarn.cmd' : 'yarn',
  ['jest', CLITEST, '--no-coverage', '--runTestsByPath'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      CONTENT_CLI_TASK: task,
      CONTENT_CLI_ARG: arg,
      CONTENT_CLI_EXTRA: JSON.stringify(extra),
    },
  },
)

process.exit(result.status ?? 1)
