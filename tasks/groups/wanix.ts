import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { chromium } from 'playwright'

import {
  WANIX_VM_VALIDATE_TIMEOUTS,
  assertguestzedcafe,
  defaultzssurl,
  dropwasm,
  dumpfailurediagnostics,
  focuscanvas,
  installapilogcapture,
  openapp,
  readapilog,
  readfixturewasm,
  readiframetaskcmds,
  readvmterm,
  runheadedwanixgate,
  sendline,
  waitfor,
  waitforapilogmatch,
  waitforvmshell,
  waitforvmtermorapilog,
  waitforzedcafeexportapilog,
  waitforzedcafevmexportready,
  warmwanixexport,
  withscripttimeout,
} from 'tasks/lib/wanix/playwright-vm'
import { def, handler, shell } from '../helpers'
import type { TaskContext, TaskDef } from '../types'

function runwanixensure(ctx: TaskContext): number {
  const root = ctx.root
  const publicdir = join(root, 'ops/fixtures/wanix')
  const npmpkg = join(root, 'node_modules/wanix/package.json')
  if (!existsSync(npmpkg)) {
    console.error(`missing ${npmpkg} — run yarn install`)
    return 1
  }
  mkdirSync(publicdir, { recursive: true })
  const npmversion = JSON.parse(readFileSync(npmpkg, 'utf8')).version as string
  const generated = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  writeFileSync(
    join(publicdir, 'BUILD_ID'),
    `wanix-npm=${npmversion}\nruntime=cdn.jsdelivr.net/npm/wanix@0.4.0-alpha8/dist\ngenerated=${generated}\n`,
  )
  console.log(`wanix runtime pin recorded (CDN) in ${publicdir}/BUILD_ID`)
  return 0
}


async function runvalidatezedcafeexportapp(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const log = (...a) => console.log('[zed-cafe-app-validate]', ...a)
  const APILOG_KEY = '__zedcafeApilog'
  
  const browser = await chromium.launch({ headless: false })
  let code = 1

  try {
    await withscripttimeout(
      'wanix:zed-cafe:export:validate',
      WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS,
      async () => {
        const page = await browser.newPage({
          ignoreHTTPSErrors: true,
          viewport: { width: 1280, height: 800 },
        })
        page.setDefaultTimeout(WANIX_VM_VALIDATE_TIMEOUTS.VM_SHELL_MS)
        await installapilogcapture(page, APILOG_KEY)
  
        page.on('console', (m) => {
          const t = m.text()
          if (/zed-cafe export|gojs|wanix vm|error/i.test(t)) {
            console.log('  [pg]', m.type(), t.slice(0, 160))
          }
        })
  
        page.on('pageerror', (err) => {
          log('pageerror:', err.message)
        })
  
        try {
          await openapp(page, defaultzssurl(), log)
          log('typing #wanix vm')
          await sendline(page, '#wanix vm')
          const booted = await waitforvmshell(page, log)
          if (!booted) {
            throw new Error('VM did not reach shell prompt')
          }
          log('BOOTED')
          await focuscanvas(page)
          await assertguestzedcafe(page, log, { apilogKey: APILOG_KEY })
          log('PASS — /zedcafe/stats.json readable in VM')
          code = 0
        } catch (err) {
          log('FAILED:', err instanceof Error ? err.message : String(err))
          await dumpfailurediagnostics(page, log, APILOG_KEY)
          code = 1
        } finally {
          await page.waitForTimeout(800)
          await page.close()
        }
      },
    )
  } catch (err) {
    log('FAILED:', err instanceof Error ? err.message : String(err))
    code = 1
  } finally {
    await browser.close()
  }
  return code
}

async function runvalidatezedcafeduplexapp(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const WASM = join(ROOT, 'ops/fixtures/wanix/zedcafewrite.wasm')
  const URL = process.env.ZSS_URL ?? 'https://localhost:7777/'
  const log = (...a) => console.log('[zed-cafe-duplex-app-validate]', ...a)
  
  if (!existsSync(WASM)) {
    console.error(
      '[zed-cafe-duplex-app-validate] missing wasm — run: yarn task run wanix:wasm:build',
    )
    return 1
  }
  
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  })
  page.setDefaultTimeout(180000)
  const apilogs = []
  
  await page.addInitScript(() => {
    window.__zedcafeApilog = []
    window.addEventListener('message', (event) => {
      const data = event.data
      if (data?.type === 'zss-wanix-term-apilog' && typeof data.message === 'string') {
        window.__zedcafeApilog.push(data.message)
      }
    })
  })
  
  page.on('console', (m) => {
    const t = m.text()
    if (/zed-cafe|wanix|error/i.test(t)) {
      apilogs.push(t)
    }
  })
  
  const wait = async (label, pred, ms, step = 2000) => {
    const dl = Date.now() + ms
    while (Date.now() < dl) {
      if (await pred()) {
        return true
      }
      await page.waitForTimeout(step)
    }
    log('TIMEOUT ' + label)
    return false
  }
  
  const sendline = async (s) => {
    await page.keyboard.type(s, { delay: 25 })
    await page.keyboard.press('Enter')
  }
  
  try {
    await page.goto(URL, { timeout: 60000, waitUntil: 'domcontentloaded' })
    await wait('canvas', async () => (await page.locator('canvas').count()) > 0, 30000)
    await page.waitForTimeout(8000)
    await page.mouse.click(640, 400)
    await page.waitForTimeout(400)
  
    log('trigger zed-cafe export via #wanix pull prep')
    await sendline('#wanix')
    await page.waitForTimeout(1500)
  
    const wasmbytes = readFileSync(WASM)
    log('dropping zedcafewrite.wasm (' + wasmbytes.length + ' bytes)')
    await page.evaluate(async (bytes) => {
      const file = new File([new Uint8Array(bytes)], 'zedcafewrite.wasm', {
        type: 'application/wasm',
      })
      const dt = new DataTransfer()
      dt.items.add(file)
      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      })
      document.dispatchEvent(event)
    }, [...wasmbytes])
  
    const writeok = await wait(
      'guest write stdout',
      async () => {
        const logs = await page.evaluate(() => window.__zedcafeApilog ?? [])
        return logs.some((line) => /zed-cafe write ok/i.test(line))
      },
      120000,
      2000,
    )
    if (!writeok) {
      throw new Error('zedcafewrite task did not report success in apilog')
    }
  
    log('pull guest tree into memory')
    await sendline('#wanix pull')
    const imported = await wait(
      'import apilog',
      async () => {
        const logs = await page.evaluate(() => window.__zedcafeApilog ?? [])
        return logs.some((line) => /zed-cafe import:/i.test(line))
      },
      30000,
      1500,
    )
    if (!imported) {
      throw new Error('#wanix pull did not log zed-cafe import')
    }

    const badwasm = join(ROOT, 'ops/fixtures/wanix/zedcafewritebad.wasm')
    if (!existsSync(badwasm)) {
      throw new Error(
        'missing zedcafewritebad.wasm — run: yarn task run wanix:wasm:build',
      )
    }
    const badbytes = readFileSync(badwasm)
    log('dropping zedcafewritebad.wasm (' + badbytes.length + ' bytes)')
    await page.evaluate(async (bytes) => {
      const file = new File([new Uint8Array(bytes)], 'zedcafewritebad.wasm', {
        type: 'application/wasm',
      })
      const dt = new DataTransfer()
      dt.items.add(file)
      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      })
      document.dispatchEvent(event)
    }, [...badbytes])

    const badblocked = await wait(
      'schema guard rejected evil.json',
      async () => {
        const logs = await page.evaluate(() => window.__zedcafeApilog ?? [])
        return logs.some((line) => /zed-cafe write bad ok/i.test(line))
      },
      120000,
      2000,
    )
    if (!badblocked) {
      throw new Error('zedcafewritebad task did not report schema guard rejection')
    }

    log('PASS — guest write + pull import + schema guard')
    return 0
  } catch (err) {
    log('FAILED:', err instanceof Error ? err.message : String(err))
    log('apilog tail:', apilogs.slice(-12).join('\n'))
    return 1
  } finally {
    await page.waitForTimeout(800)
    await browser.close()
  }
  return 0
}

async function runvalidatezedcafetaskreadapp(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const BOOK = join(ROOT, 'ops/fixtures/books/example-coolregionsbow.book.json')
  const APILOG_KEY = '__zedcafeTaskReadApilog'
  const log = (...a) => console.log('[zed-cafe-task-read-app-validate]', ...a)
  if (!existsSync(BOOK)) {
    console.error('[zed-cafe-task-read-app-validate] missing book fixture', BOOK)
    return 1
  }
  return runheadedwanixgate('wanix:zed-cafe:task-read:validate', async ({ page }) => {
    await installapilogcapture(page, APILOG_KEY)
    await openapp(page, defaultzssurl(), log)
    log('import coolregionsbow book')
    const bookbytes = readFileSync(BOOK)
    await page.evaluate(async (payload) => {
      const file = new File([new Uint8Array(payload)], 'example-coolregionsbow.book.json', {
        type: 'application/json',
      })
      const dt = new DataTransfer()
      dt.items.add(file)
      document.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }),
      )
    }, [...bookbytes])
    await page.waitForTimeout(2000)
    log('dropping zedcaferead.wasm')
    await dropwasm(page, 'zedcaferead.wasm', readfixturewasm(ROOT, 'zedcaferead'))
    const ok = await waitforvmtermorapilog(
      page,
      APILOG_KEY,
      /zed-cafe ok:/i,
      120_000,
      log,
    )
    if (!ok) {
      await dumpfailurediagnostics(page, log, APILOG_KEY)
      throw new Error('zedcaferead task did not print zed-cafe ok:')
    }
    log('PASS — dropped WASI task read zedcafe/stats.json')
    return 0
  })
}

async function runvalidatewanixvmboot(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const BOOK = join(ROOT, 'ops/fixtures/books/example-coolregionsbow.book.json')
  const log = (...a) => console.log('[wanix-vm-boot-validate]', ...a)
  
  const BOOT_SCRIPT_TOTAL_MS =
    WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS + 60_000
  
  if (!existsSync(BOOK)) {
    console.error('[wanix-vm-boot-validate] missing book fixture', BOOK)
    return 1
  }
  
  const browser = await chromium.launch({ headless: false })
  
  const dropbook = async (page) => {
    const bytes = readFileSync(BOOK)
    await page.evaluate(async (payload) => {
      const file = new File([new Uint8Array(payload)], 'example-coolregionsbow.book.json', {
        type: 'application/json',
      })
      const dt = new DataTransfer()
      dt.items.add(file)
      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      })
      document.dispatchEvent(event)
    }, [...bytes])
  }
  
  try {
    await withscripttimeout(
      'wanix:vm:boot:validate',
      BOOT_SCRIPT_TOTAL_MS,
      async () => {
        const page = await browser.newPage({
          ignoreHTTPSErrors: true,
          viewport: { width: 1280, height: 800 },
        })
        page.setDefaultTimeout(WANIX_VM_VALIDATE_TIMEOUTS.VM_SHELL_MS)
  
        const readdirnoise = []
        const APILOG_KEY = '__wanixVmBootApilog'
  
        await installapilogcapture(page, APILOG_KEY)
  
        page.on('console', (m) => {
          const t = m.text()
          if (/readdir.*invalid argument/i.test(t)) {
            readdirnoise.push(t)
          }
          if (/zed-cafe export|gojs|wanix vm|error/i.test(t)) {
            log('  [pg]', m.type(), t.slice(0, 160))
          }
        })
  
        try {
          await openapp(page, defaultzssurl(), log)
  
          log('import coolregionsbow book')
          await dropbook(page)
          await page.waitForTimeout(3000)
  
          log('typing #wanix vm')
          const vmstart = Date.now()
          await sendline(page, '#wanix vm')

          await waitforzedcafevmexportready(page, log, APILOG_KEY)
          log(`Milestone A ok (${Date.now() - vmstart}ms)`)
  
          const booted = await waitforvmshell(page, log)
          if (!booted) {
            throw new Error('Milestone B failed — VM did not reach shell prompt')
          }
          log('Milestone B ok')
  
          await focuscanvas(page)
          await assertguestzedcafe(page, log, { apilogKey: APILOG_KEY })
  
          if (readdirnoise.length > 5) {
            log('Milestone F warn — readdir noise count', readdirnoise.length)
          }
  
          log('PASS — #wanix vm boot with seeded export')
          return 0
        } catch (err) {
          log('FAILED:', err instanceof Error ? err.message : String(err))
          await dumpfailurediagnostics(page, log, APILOG_KEY)
          return 1
        } finally {
          await page.waitForTimeout(800)
          await page.close()
        }
      },
    )
  } catch (err) {
    log('FAILED:', err instanceof Error ? err.message : String(err))
    return 1
  } finally {
    await browser.close()
  }
  return 0
}

async function runvalidatewanixvmzedcafe(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const BOOK = join(ROOT, 'ops/fixtures/books/example-coolregionsbow.book.json')
  const log = (...a) => console.log('[wanix-vm-zedcafe-validate]', ...a)
  const APILOG_KEY = '__wanixVmZedcafeApilog'

  if (!existsSync(BOOK)) {
    console.error('[wanix-vm-zedcafe-validate] missing book fixture', BOOK)
    return 1
  }

  const browser = await chromium.launch({ headless: false })

  try {
    return await withscripttimeout(
      'wanix:vm:zed-cafe:validate',
      WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS,
      async () => {
        const page = await browser.newPage({
          ignoreHTTPSErrors: true,
          viewport: { width: 1280, height: 800 },
        })
        page.setDefaultTimeout(WANIX_VM_VALIDATE_TIMEOUTS.VM_SHELL_MS)
  
        await installapilogcapture(page, APILOG_KEY)
  
        page.on('console', (m) => {
          const t = m.text()
          if (/zed-cafe export|gojs|wanix vm|error/i.test(t)) {
            log('  [pg]', m.type(), t.slice(0, 160))
          }
        })
  
        page.on('pageerror', (err) => {
          log('pageerror:', err.message)
        })
  
        try {
          await openapp(page, defaultzssurl(), log)

          log('import coolregionsbow book')
          const bookbytes = readFileSync(BOOK)
          await page.evaluate(async (payload) => {
            const file = new File([new Uint8Array(payload)], 'example-coolregionsbow.book.json', {
              type: 'application/json',
            })
            const dt = new DataTransfer()
            dt.items.add(file)
            document.dispatchEvent(
              new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }),
            )
          }, [...bookbytes])
          await page.waitForTimeout(2000)

          log('typing #wanix vm')
          await sendline(page, '#wanix vm')

          await waitforzedcafevmexportready(page, log, APILOG_KEY)
          log('Milestone A ok — #ramfs/zedcafe ready, vm activating')
  
          const booted = await waitforvmshell(page, log)
          if (!booted) {
            throw new Error('VM did not reach shell prompt')
          }
          log('Milestone B ok — VM shell')
  
          await focuscanvas(page)
          await assertguestzedcafe(page, log, { apilogKey: APILOG_KEY })
  
          log('PASS — /zedcafe/ visible and readable after #wanix vm')
          return 0
        } catch (err) {
          log('FAILED:', err instanceof Error ? err.message : String(err))
          await dumpfailurediagnostics(page, log, APILOG_KEY)
          return 1
        } finally {
          await page.waitForTimeout(800)
          await page.close()
        }
      },
    )
  } catch (err) {
    log('FAILED:', err instanceof Error ? err.message : String(err))
    return 1
  } finally {
    await browser.close()
  }
}

async function runvalidatezedcafelistapp(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const WASM = join(ROOT, 'ops/fixtures/wanix/zedcafelist.wasm')
  const APILOG_KEY = '__zedcafeListApilog'
  const log = (...a) => console.log('[zed-cafe-list-app-validate]', ...a)
  
  if (!existsSync(WASM)) {
    console.error(
      '[zed-cafe-list-app-validate] missing wasm — run: yarn task run wanix:wasm:build',
    )
    return 1
  }
  
  const browser = await chromium.launch({ headless: false })
  let exitcode = 1

  try {
    exitcode = await withscripttimeout(
      'zed-cafe-list-app-validate',
      WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS,
      async () => {
        const page = await browser.newPage({
          ignoreHTTPSErrors: true,
          viewport: { width: 1280, height: 800 },
        })
        page.setDefaultTimeout(WANIX_VM_VALIDATE_TIMEOUTS.VM_SHELL_MS)
  
        const consoleerrors = []
        await installapilogcapture(page, APILOG_KEY)
  
        page.on('console', (m) => {
          const t = m.text()
          if (
            /#task\/\d+\/export.*does not exist/i.test(t) ||
            /readdir.*file does not exist/i.test(t)
          ) {
            consoleerrors.push(t)
          }
          if (/zed-cafe export|gojs|wanix|error/i.test(t)) {
            log('  [pg]', m.type(), t.slice(0, 160))
          }
        })
  
        const wait = async (label, pred, ms, step = 2000) => {
          const deadline = Date.now() + ms
          while (Date.now() < deadline) {
            if (await pred()) {
              return true
            }
            await page.waitForTimeout(step)
          }
          log('TIMEOUT', label)
          return false
        }
  
        try {
          await openapp(page, defaultzssurl(), log)
          log('warming wanix via #wanix')
          await sendline(page, '#wanix')
          await page.waitForTimeout(3000)
          log('warming zed-cafe export via #wanix pull')
          await sendline(page, '#wanix pull')
          await waitforzedcafeexportapilog(page, log, APILOG_KEY)
  
          const exportwarm = await wait(
            'guest zed-cafe ready',
            async () => {
              const logs = await readapilog(page, APILOG_KEY)
              return logs.some((line) => /guest zed-cafe ready/i.test(line))
            },
            120_000,
            2000,
          )
          if (!exportwarm) {
            throw new Error('zed-cafe guest ./zed-cafe never became ready')
          }
  
          const wasmbytes = readFileSync(WASM)
          log('dropping zedcafelist.wasm (' + wasmbytes.length + ' bytes)')
          await page.evaluate(async (bytes) => {
            const file = new File([new Uint8Array(bytes)], 'zedcafelist.wasm', {
              type: 'application/wasm',
            })
            const dt = new DataTransfer()
            dt.items.add(file)
            const event = new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              dataTransfer: dt,
            })
            document.dispatchEvent(event)
          }, [...wasmbytes])
  
          const listok = await wait(
            'zed-cafe list output',
            async () => {
              const logs = await readapilog(page, APILOG_KEY)
              return (
                logs.some((line) => /zed-cafe list/i.test(line)) &&
                logs.some((line) => /stats\.json/.test(line)) &&
                !logs.some((line) => /zed-cafe missing/i.test(line))
              )
            },
            120_000,
            2000,
          )
          if (!listok) {
            throw new Error('zedcafelist did not print zed-cafe tree with stats.json')
          }
  
          if (consoleerrors.length > 0) {
            throw new Error(
              'console export errors: ' + consoleerrors.slice(0, 3).join(' | '),
            )
          }
  
          await focuscanvas(page)
          log('PASS — zed-cafe list shows stats.json after export warm')
          return 0
        } catch (err) {
          log('FAILED:', err instanceof Error ? err.message : String(err))
          await dumpfailurediagnostics(page, log, APILOG_KEY)
          return 1
        } finally {
          await page.waitForTimeout(800)
          await page.close()
        }
      },
    )
  } catch (err) {
    log('FAILED:', err instanceof Error ? err.message : String(err))
    exitcode = 1
  } finally {
    await browser.close()
  }
  return exitcode
}

async function runvalidatezedcafememfs(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const WANIX_GO_DIR = join(ROOT, 'ops/fixtures/wanix')
  const DEV_URL = process.env.ZSS_URL ?? 'https://localhost:7777/'
  const log = (...a) => console.log('[zed-cafe-memfs-validate]', ...a)

  function run(cmd, args, opts = {}) {
    log('$', cmd, ...args)
    const result = spawnSync(cmd, args, {
      cwd: opts.cwd ?? ROOT,
      stdio: 'inherit',
      env: { ...process.env, ...opts.env },
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
    { name: 'wanix build all', run: () => run('sh', ['ops/fixtures/wanix/build.sh', 'all']) },
    { name: 'go test exportfs', run: () => run('go', ['test', './zedcafe/...', './zedcafelist/...'], { cwd: WANIX_GO_DIR }) },
    {
      name: 'export:validate',
      run: async () => {
        await ensuredevserver()
        const code = await runvalidatezedcafeexportapp(ctx)
        if (code !== 0) throw new Error('export:validate failed')
      },
    },
    {
      name: 'duplex:validate',
      run: async () => {
        const code = await runvalidatezedcafeduplexapp(ctx)
        if (code !== 0) throw new Error('duplex:validate failed')
      },
    },
    {
      name: 'task-read:validate',
      run: async () => {
        const code = await runvalidatezedcafetaskreadapp(ctx)
        if (code !== 0) throw new Error('task-read:validate failed')
      },
    },
    {
      name: 'list-app:validate',
      run: async () => {
        await ensuredevserver()
        const code = await runvalidatezedcafelistapp(ctx)
        if (code !== 0) throw new Error('list-app:validate failed')
      },
    },
    {
      name: 'jest wanix smoke',
      run: () =>
        run('yarn', [
          'jest',
          '--config',
          'ops/jest.config.ts',
          'ops/tests/unit/feature/wanix/zedcafetreeschema.test.ts',
          'ops/tests/unit/feature/wanix/wanixstateexport.test.ts',
          'ops/tests/unit/feature/wanix/wanixstateimport.test.ts',
          'ops/tests/unit/feature/wanix/wanixiframechildmount.test.ts',
          '--no-coverage',
        ]),
    },
  ]

  try {
    for (const step of steps) {
      log('—', step.name)
      await step.run()
      log('  ✓', step.name)
    }
    log('\nAll steps PASS')
    return 0
  } catch (err) {
    log('\nFAILED:', err instanceof Error ? err.message : String(err))
    return 1
  } finally {
    stopdevserver()
  }
}

async function runvalidatehelloapp(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const APILOG_KEY = '__helloApilog'
  const log = (...a) => console.log('[hello-app-validate]', ...a)
  return runheadedwanixgate('wanix:hello:validate', async ({ page }) => {
    await installapilogcapture(page, APILOG_KEY)
    await openapp(page, defaultzssurl(), log)
    const bytes = readfixturewasm(ROOT, 'hello')
    log('dropping hello.wasm')
    await dropwasm(page, 'hello.wasm', bytes)
    const ok = await waitforvmtermorapilog(
      page,
      APILOG_KEY,
      /Hello from wanix!/i,
      120_000,
      log,
    )
    if (!ok) {
      await dumpfailurediagnostics(page, log, APILOG_KEY)
      throw new Error('hello.wasm did not print Hello from wanix!')
    }
    log('PASS — hello.wasm stdout')
    return 0
  })
}

async function runvalidateholdapp(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const APILOG_KEY = '__holdApilog'
  const log = (...a) => console.log('[hold-app-validate]', ...a)
  return runheadedwanixgate('wanix:hold:validate', async ({ page }) => {
    await installapilogcapture(page, APILOG_KEY)
    await openapp(page, defaultzssurl(), log)
    const bytes = readfixturewasm(ROOT, 'hold')
    log('dropping hold.wasm')
    await dropwasm(page, 'hold.wasm', bytes)
    const spawned = await waitfor(
      page,
      'hold task spawn',
      async () => {
        const cmds = await readiframetaskcmds(page)
        return cmds.some((cmd) => /hold\.wasm/i.test(cmd))
      },
      60_000,
      2000,
      log,
    )
    if (!spawned) {
      await dumpfailurediagnostics(page, log, APILOG_KEY)
      throw new Error('hold.wasm task did not spawn')
    }
    log('hold task spawned — waiting 5s for steady state')
    await page.waitForTimeout(5000)
    const cmds = await readiframetaskcmds(page)
    if (!cmds.some((cmd) => /hold\.wasm/i.test(cmd))) {
      throw new Error('hold.wasm exited before 5s')
    }
    log('PASS — hold.wasm still running after 5s')
    return 0
  })
}

async function runvalidatetermbridgeapp(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const APILOG_KEY = '__termbridgeApilog'
  const log = (...a) => console.log('[termbridge-app-validate]', ...a)
  return runheadedwanixgate('wanix:termbridge:validate', async ({ page }) => {
    await installapilogcapture(page, APILOG_KEY)
    await openapp(page, defaultzssurl(), log)
    const bytes = readfixturewasm(ROOT, 'termbridge')
    log('dropping termbridge.wasm')
    await dropwasm(page, 'termbridge.wasm', bytes)
    const banner = await waitforvmtermorapilog(
      page,
      APILOG_KEY,
      /wanix term bridge ready/i,
      120_000,
      log,
    )
    if (!banner) {
      await dumpfailurediagnostics(page, log, APILOG_KEY)
      throw new Error('termbridge.wasm did not print banner')
    }
    log('banner ok — sending ping')
    await focuscanvas(page)
    await sendline(page, 'ping')
    const pong = await waitfor(
      page,
      'ping pong',
      async () => /pong/i.test(await readvmterm(page)),
      30_000,
      1500,
      log,
    )
    if (!pong) {
      const tile = await readvmterm(page)
      log('tile tail:\n' + tile.split('\n').slice(-12).join('\n'))
      throw new Error('ping did not produce pong on tile')
    }
    log('PASS — termbridge banner + ping/pong')
    return 0
  })
}

async function runvalidatewasmfixturesapp(ctx: TaskContext): Promise<number> {
  const ROOT = ctx.root
  const APILOG_KEY = '__wasmFixturesApilog'
  const log = (...a) => console.log('[wasm-fixtures-validate]', ...a)
  return runheadedwanixgate('wanix:wasm:fixtures:validate', async ({ page }) => {
    await installapilogcapture(page, APILOG_KEY)
    await openapp(page, defaultzssurl(), log)

    log('step 1 — hello.wasm')
    await dropwasm(page, 'hello.wasm', readfixturewasm(ROOT, 'hello'))
    if (
      !(await waitforvmtermorapilog(
        page,
        APILOG_KEY,
        /Hello from wanix!/i,
        120_000,
        log,
      ))
    ) {
      throw new Error('composite: hello failed')
    }

    log('step 2 — hold.wasm')
    await dropwasm(page, 'hold.wasm', readfixturewasm(ROOT, 'hold'))
    const holdspawn = await waitfor(
      page,
      'hold spawn',
      async () => {
        const cmds = await readiframetaskcmds(page)
        return cmds.some((cmd) => /hold\.wasm/i.test(cmd))
      },
      60_000,
      2000,
      log,
    )
    if (!holdspawn) {
      throw new Error('composite: hold spawn failed')
    }
    await page.waitForTimeout(5000)

    log('step 3 — termbridge.wasm')
    await dropwasm(page, 'termbridge.wasm', readfixturewasm(ROOT, 'termbridge'))
    if (
      !(await waitforvmtermorapilog(
        page,
        APILOG_KEY,
        /wanix term bridge ready/i,
        120_000,
        log,
      ))
    ) {
      throw new Error('composite: termbridge banner failed')
    }
    await focuscanvas(page)
    await sendline(page, 'ping')
    if (
      !(await waitfor(
        page,
        'ping pong',
        async () => /pong/i.test(await readvmterm(page)),
        30_000,
        1500,
        log,
      ))
    ) {
      throw new Error('composite: ping/pong failed')
    }

    log('step 4 — warm zedcafe export')
    await warmwanixexport(page, log, APILOG_KEY)

    log('step 5 — zedcaferead.wasm')
    await dropwasm(page, 'zedcaferead.wasm', readfixturewasm(ROOT, 'zedcaferead'))
    if (
      !(await waitforapilogmatch(page, APILOG_KEY, /zed-cafe ok:/i, 120_000, log))
    ) {
      throw new Error('composite: zedcaferead failed')
    }

    log('step 6 — zedcafewrite.wasm + pull')
    await dropwasm(page, 'zedcafewrite.wasm', readfixturewasm(ROOT, 'zedcafewrite'))
    if (
      !(await waitforapilogmatch(
        page,
        APILOG_KEY,
        /zed-cafe write ok/i,
        120_000,
        log,
      ))
    ) {
      throw new Error('composite: zedcafewrite failed')
    }
    await sendline(page, '#wanix pull')
    if (
      !(await waitforapilogmatch(
        page,
        APILOG_KEY,
        /zed-cafe import:/i,
        30_000,
        log,
      ))
    ) {
      throw new Error('composite: pull import failed')
    }

    log('step 7 — zedcafewritebad.wasm')
    await dropwasm(
      page,
      'zedcafewritebad.wasm',
      readfixturewasm(ROOT, 'zedcafewritebad'),
    )
    if (
      !(await waitforapilogmatch(
        page,
        APILOG_KEY,
        /zed-cafe write bad ok/i,
        120_000,
        log,
      ))
    ) {
      throw new Error('composite: zedcafewritebad failed')
    }

    log('step 8 — zedcafelist.wasm')
    await dropwasm(page, 'zedcafelist.wasm', readfixturewasm(ROOT, 'zedcafelist'))
    const listok = await waitfor(
      page,
      'zed-cafe list',
      async () => {
        const logs = await readapilog(page, APILOG_KEY)
        return (
          logs.some((line) => /zed-cafe list/i.test(line)) &&
          logs.some((line) => /stats\.json/i.test(line)) &&
          !logs.some((line) => /zed-cafe missing/i.test(line))
        )
      },
      120_000,
      2000,
      log,
    )
    if (!listok) {
      throw new Error('composite: zedcafelist failed')
    }

    log('PASS — all 7 WASI fixtures in one session')
    return 0
  })
}

export const WANIX_TASKS: TaskDef[] = [
  def('wanix:ensure', {
    description: 'Record pinned wanix npm version (runtime loads from jsDelivr CDN)',
    run: handler(runwanixensure),
  }),
  def('wanix:wasm:build', {
    description:
      'Compile ops/fixtures/wanix Go WASI fixtures (hello, hold, termbridge, zed-cafe gates) to .wasm',
    run: shell('sh ops/fixtures/wanix/build.sh wasi'),
  }),
  def('wanix:zed-cafe:build', {
    description: 'Build zedcafe.wasm (Go js/wasm) into ops/fixtures/wanix/ and cafe/public/wanix/',
    tags: ['ci'],
    run: shell('sh ops/fixtures/wanix/build.sh zedcafe'),
  }),
  def('wanix:zed-cafe:export:validate', {
    description: 'Headed Playwright: full app #wanix vm → cat /zedcafe/stats.json (local gate, not CI)',
    run: handler(runvalidatezedcafeexportapp),
  }),
  def('wanix:zed-cafe:memfs:validate', {
    description: 'Composite ExportFS rollout gate — build, go test, headed app Playwright, jest smoke',
    run: handler(runvalidatezedcafememfs),
  }),
  def('wanix:zed-cafe:task-read:validate', {
    description: 'Headed Playwright: full app drop zedcaferead.wasm reads zedcafe/stats.json (local gate, not CI)',
    run: handler(runvalidatezedcafetaskreadapp),
  }),
  def('wanix:zed-cafe:duplex:validate', {
    description: 'Headed Playwright: full app drop zedcafewrite.wasm + #wanix pull import (local gate, not CI)',
    run: handler(runvalidatezedcafeduplexapp),
  }),
  def('wanix:vm:boot:validate', {
    description: 'Headed Playwright: seeded book + #wanix vm must reach shell and /zedcafe/stats.json (local gate, not CI)',
    run: handler(runvalidatewanixvmboot),
  }),
  def('wanix:vm:zed-cafe:validate', {
    description: 'Headed Playwright: #wanix vm → ls / shows zedcafe, cat stats.json (primary local gate, not CI)',
    run: handler(runvalidatewanixvmzedcafe),
  }),
  def('wanix:zed-cafe:list:validate', {
    description: 'Headed Playwright: drop zedcafelist.wasm after export warm (local gate, not CI)',
    run: handler(runvalidatezedcafelistapp),
  }),
  def('wanix:hello:validate', {
    description: 'Headed Playwright: drop hello.wasm → Hello from wanix! (local gate, not CI)',
    run: handler(runvalidatehelloapp),
  }),
  def('wanix:hold:validate', {
    description: 'Headed Playwright: drop hold.wasm stays running 5s (local gate, not CI)',
    run: handler(runvalidateholdapp),
  }),
  def('wanix:termbridge:validate', {
    description: 'Headed Playwright: drop termbridge.wasm banner + ping/pong (local gate, not CI)',
    run: handler(runvalidatetermbridgeapp),
  }),
  def('wanix:wasm:fixtures:validate', {
    description: 'Headed Playwright: all 7 WASI fixtures sequential in one session (local gate, not CI)',
    run: handler(runvalidatewasmfixturesapp),
  }),
  def('wanix:wasm:build:all', {
    description: 'Compile wanix Go WASI fixtures and zedcafe export wasm',
    run: shell('sh ops/fixtures/wanix/build.sh all'),
  }),
]
