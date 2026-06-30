import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { chromium } from 'playwright'

import {
  WANIX_VM_VALIDATE_TIMEOUTS,
  assertguestzedcafe,
  defaultzssurl,
  dumpfailurediagnostics,
  focuscanvas,
  installapilogcapture,
  openapp,
  readapilog,
  readvmterm,
  sendline,
  waitfor,
  waitforvmshell,
  waitforzedcafeexportapilog,
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
          log('PASS — /zed-cafe/stats.json readable in VM')
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
  const WASM = join(ROOT, 'ops/fixtures/wanix/zedcaferead.wasm')
  const log = (...a) => console.log('[zed-cafe-task-read-app-validate]', ...a)
  const APILOG_KEY = '__zedcafeTaskReadApilog'
  
  if (!existsSync(WASM)) {
    console.error(
      '[zed-cafe-task-read-app-validate] missing wasm — run: yarn task run wanix:wasm:build',
    )
    return 1
  }
  
  const browser = await chromium.launch({ headless: false })
  
  try {
    await withscripttimeout(
      'wanix:zed-cafe:task-read:validate',
      WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS,
      async () => {
        const page = await browser.newPage({
          ignoreHTTPSErrors: true,
          viewport: { width: 1280, height: 800 },
        })
        page.setDefaultTimeout(WANIX_VM_VALIDATE_TIMEOUTS.VM_SHELL_MS)
        await installapilogcapture(page, APILOG_KEY)
  
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
          log('warm export via #wanix')
          await sendline(page, '#wanix')
          await page.waitForTimeout(2000)
  
          const wasmbytes = readFileSync(WASM)
          log('dropping zedcaferead.wasm (' + wasmbytes.length + ' bytes)')
          await page.evaluate(async (bytes) => {
            const file = new File([new Uint8Array(bytes)], 'zedcaferead.wasm', {
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
  
          const readok = await wait(
            'zed-cafe ok stdout',
            async () => {
              const logs = await page.evaluate((key) => window[key] ?? [], APILOG_KEY)
              return logs.some((line) => /zed-cafe ok:/i.test(line))
            },
            120000,
            2000,
          )
          if (!readok) {
            throw new Error('zedcaferead task did not print zed-cafe ok: on tile')
          }
  
          await focuscanvas(page)
          log('PASS — dropped WASI task read zed-cafe/stats.json')
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
  
          const milestonea = await waitfor(
            page,
            'milestone A vm export mount',
            async () => {
              const logs = await readapilog(page, APILOG_KEY)
              return logs.some((line) =>
                /#ramfs\/zed-cafe ready — remounting wanix-system with wanix-vm/.test(line),
              )
            },
            WANIX_VM_VALIDATE_TIMEOUTS.EXPORT_APILOG_MS,
            2000,
            log,
          )
          if (!milestonea) {
            const tail = (await readapilog(page, APILOG_KEY)).slice(-12)
            log('apilog tail:', tail.join('\n'))
            throw new Error(
              'Milestone A failed — export never reached vm remount within timeout',
            )
          }
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
  const log = (...a) => console.log('[wanix-vm-zedcafe-validate]', ...a)
  const APILOG_KEY = '__wanixVmZedcafeApilog'
  
  const browser = await chromium.launch({ headless: false })
  
  try {
    await withscripttimeout(
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
  
          log('typing #wanix vm')
          await sendline(page, '#wanix vm')
  
          const exportmounted = await waitfor(
            page,
            'zed-cafe vm mount',
            async () => {
              const logs = await readapilog(page, APILOG_KEY)
              return logs.some((line) =>
                /#ramfs\/zed-cafe ready — remounting wanix-system with wanix-vm/.test(line),
              )
            },
            WANIX_VM_VALIDATE_TIMEOUTS.EXPORT_APILOG_MS,
            2000,
            log,
          )
          if (!exportmounted) {
            throw new Error('zed-cafe export never reached vm mount milestone')
          }
          log('Milestone A ok — #ramfs/zed-cafe ready, wanix-vm mounting')
  
          const booted = await waitforvmshell(page, log)
          if (!booted) {
            throw new Error('VM did not reach shell prompt')
          }
          log('Milestone B ok — VM shell')
  
          await focuscanvas(page)
          await assertguestzedcafe(page, log, { apilogKey: APILOG_KEY })
  
          log('PASS — /zed-cafe/ visible and readable after #wanix vm')
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
    { name: 'go test exportfs', run: () => run('go', ['test', './zed-cafe/...', './zedcafelist/...'], { cwd: WANIX_GO_DIR }) },
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
  def('wanix:gojs:build', {
    description: 'Build upstream gojscheck.wasm (Go js/wasm) for terminal smoke tests',
    run: shell('sh ops/fixtures/wanix/build.sh gojs'),
  }),
  def('wanix:zed-cafe:build', {
    description: 'Build zed-cafe.wasm (Go js/wasm) into ops/fixtures/wanix/ and cafe/public/wanix/',
    tags: ['ci'],
    run: shell('sh ops/fixtures/wanix/build.sh zed-cafe'),
  }),
  def('wanix:zed-cafe:export:validate', {
    description: 'Headed Playwright: full app #wanix vm → cat /zed-cafe/stats.json (local gate, not CI)',
    run: handler(runvalidatezedcafeexportapp),
  }),
  def('wanix:zed-cafe:memfs:validate', {
    description: 'Composite ExportFS rollout gate — build, go test, headed app Playwright, jest smoke',
    run: handler(runvalidatezedcafememfs),
  }),
  def('wanix:zed-cafe:task-read:validate', {
    description: 'Headed Playwright: full app drop zedcaferead.wasm reads zed-cafe/stats.json (local gate, not CI)',
    run: handler(runvalidatezedcafetaskreadapp),
  }),
  def('wanix:zed-cafe:duplex:validate', {
    description: 'Headed Playwright: full app drop zedcafewrite.wasm + #wanix pull import (local gate, not CI)',
    run: handler(runvalidatezedcafeduplexapp),
  }),
  def('wanix:vm:boot:validate', {
    description: 'Headed Playwright: seeded book + #wanix vm must reach shell and /zed-cafe/stats.json (local gate, not CI)',
    run: handler(runvalidatewanixvmboot),
  }),
  def('wanix:vm:zed-cafe:validate', {
    description: 'Headed Playwright: #wanix vm → ls / shows zed-cafe, cat stats.json (primary local gate, not CI)',
    run: handler(runvalidatewanixvmzedcafe),
  }),
  def('wanix:zed-cafe:list:validate', {
    description: 'Headed Playwright: drop zedcafelist.wasm after export warm (local gate, not CI)',
    run: handler(runvalidatezedcafelistapp),
  }),
  def('wanix:wasm:build:all', {
    description: 'Compile wanix Go WASI fixtures and zed-cafe export wasm',
    run: shell('sh ops/fixtures/wanix/build.sh all'),
  }),
]
