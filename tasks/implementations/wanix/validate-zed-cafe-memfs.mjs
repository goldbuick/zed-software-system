/**
 * Composite zed-cafe ExportFS (memfs) rollout validator.
 *
 * Builds wasm, runs Go unit tests, starts dev server if needed, runs harness gates.
 *
 * Usage: yarn task run wanix:zed-cafe:memfs:validate
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const ROOT = join(import.meta.dirname, '../../..')
const ZED_CAFE_DIR = join(ROOT, 'ops/fixtures/wanix/zed-cafe')
const DEV_URL = process.env.ZSS_URL ?? 'https://localhost:7777/'
const log = (...a) => console.log('[zed-cafe-memfs-validate]', ...a)

function run(cmd, args, opts = {}) {
  log('$', cmd, ...args)
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ZSS_PLAYWRIGHT_HEADLESS: '1', ...opts.env },
    ...opts,
  })
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${result.status})`)
  }
}

async function isdevserverup() {
  try {
    const result = spawnSync(
      'curl',
      ['-ksf', '-o', '/dev/null', '-w', '%{http_code}', DEV_URL],
      { cwd: ROOT, encoding: 'utf8' },
    )
    const code = Number.parseInt(String(result.stdout ?? '').trim(), 10)
    return result.status === 0 && code >= 200 && code < 500
  } catch {
    return false
  }
}

async function waitfordevserver(ms = 120000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await isdevserverup()) {
      return true
    }
    await delay(1000)
  }
  return false
}

let devchild = null
let starteddev = false

async function ensuredevserver() {
  if (await isdevserverup()) {
    log('dev server already up at', DEV_URL)
    return
  }
  log('starting app:vite:dev …')
  devchild = spawn('yarn', ['task', 'run', 'app:vite:dev'], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: false,
  })
  starteddev = true
  if (!(await waitfordevserver())) {
    throw new Error('dev server did not become ready')
  }
  log('dev server ready')
}

function stopdevserver() {
  if (starteddev && devchild && !devchild.killed) {
    devchild.kill('SIGTERM')
  }
}

const steps = [
  {
    name: 'wanix:zed-cafe:build',
    run: () => run('yarn', ['task', 'run', 'wanix:zed-cafe:build']),
  },
  {
    name: 'wanix:wasm:build',
    run: () => run('yarn', ['task', 'run', 'wanix:wasm:build']),
  },
  {
    name: 'go test exportfs',
    run: () => run('go', ['test', './...'], { cwd: ZED_CAFE_DIR }),
  },
  {
    name: 'export:validate',
    run: async () => {
      await ensuredevserver()
      run('node', [
        'tasks/implementations/wanix/validate-zed-cafe-export.mjs',
      ])
    },
  },
  {
    name: 'export-write:validate',
    run: () =>
      run('node', [
        'tasks/implementations/wanix/validate-zed-cafe-export-write.mjs',
      ]),
  },
  {
    name: 'task-read:validate',
    run: () =>
      run('node', [
        'tasks/implementations/wanix/validate-zed-cafe-task-read.mjs',
      ]),
  },
  {
    name: 'jest wanix smoke',
    run: () =>
      run('yarn', [
        'jest',
        'ops/tests/unit/feature/wanix/wanixiframechildmount.test.ts',
        'ops/tests/unit/feature/wanix/wanixstateexport.test.ts',
        '--no-coverage',
      ]),
  },
]

const results = []

try {
  for (const step of steps) {
    log('—', step.name)
    await step.run()
    results.push({ name: step.name, pass: true })
  }
  log('\nAll steps PASS')
  for (const row of results) {
    log('  ✓', row.name)
  }
} catch (err) {
  log('\nFAILED:', err instanceof Error ? err.message : String(err))
  process.exitCode = 1
} finally {
  stopdevserver()
}
