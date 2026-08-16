/**
 * Headed media-queue TV sink proof (host + join).
 *
 * Prereq: cafe dev server on --url (default https://localhost:7777)
 *
 * yarn task run cafe:playwright:headed https://localhost:7777 ops/lib/mediaqueue-parity/tvsink-headed.ts
 *
 * Media URL: defaults to YouTube (yt-dlp). Override with MQ_TVSINK_MEDIA_URL.
 * Fast local loop: MQ_TVSINK_USE_FIXTURE=1 (skips yt-dlp, uses ops/fixtures/media/test.mp4).
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { Page } from '@playwright/test'
import { waittvsink } from 'ops/lib/mediaqueue-parity/tvsink-assert'
import type { HeadedPlaywrightContext } from 'tasks/lib/playwright/runheadedscript'
import {
  PARITY_RENDER_SCRIPT_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'

const HELPER_SPAWN_TIMEOUT_MS = 180_000
const HOST_BIND_TIMEOUT_MS = 120_000
const JOIN_CONNECT_TIMEOUT_MS = 120_000
const STREAM_ASSERT_TIMEOUT_MS = 120_000
const SCRIPT_TIMEOUT_MS = 300_000
const YOUTUBE_DOWNLOAD_TIMEOUT_MS = 600_000
const BOOT_WAIT_MS = 15_000
const JOIN_HOST_READY_MS = 45_000
const BOOK_FIXTURE_PATH = '/fixtures/books/example-coolregionsbow.book.json'
const DEFAULT_TVSINK_MEDIA_URL =
  'https://youtu.be/uB1D9wWxd2w?si=BYrXxUwAIFp2l7Q7'

function isyoutubeurl(url: string) {
  return /youtube\.com\/watch|youtu\.be\//i.test(url)
}

function resolvemediaurl(): {
  mediaurl: string
  usedevfixture: boolean
  downloadtimeoutms: number
} {
  const usefixture = process.env.MQ_TVSINK_USE_FIXTURE === '1'
  if (usefixture) {
    return {
      mediaurl: '',
      usedevfixture: true,
      downloadtimeoutms: HOST_BIND_TIMEOUT_MS,
    }
  }
  const mediaurl = (
    process.env.MQ_TVSINK_MEDIA_URL ?? DEFAULT_TVSINK_MEDIA_URL
  ).trim()
  const youtube = isyoutubeurl(mediaurl)
  return {
    mediaurl,
    usedevfixture: false,
    downloadtimeoutms: youtube
      ? YOUTUBE_DOWNLOAD_TIMEOUT_MS
      : HOST_BIND_TIMEOUT_MS,
  }
}

async function bootcafehost(page: Page, baseurl: string, root: string) {
  const bookpath = path.join(
    root,
    'ops/fixtures/books/example-coolregionsbow.book.json',
  )
  const bookjson = fs.readFileSync(bookpath, 'utf8')
  const bookenvelope = JSON.parse(bookjson) as {
    data?: {
      activelist?: string[]
      flags?: Record<string, { board?: string }>
      name?: string
    }
  }
  const bookdata = bookenvelope.data
  const bookplayer = bookdata?.activelist?.[0]?.trim?.() ?? ''
  const bookboard = bookdata?.flags?.[bookplayer]?.board?.trim?.() ?? ''
  if (!bookplayer || !bookdata) {
    throw new Error('bootcafehost: book activelist player missing')
  }
  if (!bookboard) {
    throw new Error('bootcafehost: book player board missing')
  }
  const cleanurl = new URL(baseurl)
  cleanurl.hash = ''
  await page.goto(cleanurl.href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await page.waitForSelector('#frame', { timeout: 60_000 })
  await sleep(3000)
  const loaded = await page.evaluate(
    async ({ projectroot, playerid }) => {
      try {
        const api = await import(`/@fs${projectroot}/zss/device/api.ts`)
        const { registersetmyplayerid } = await import(
          `/@fs${projectroot}/zss/device/register/player.ts`
        )
        const { register } = await import(
          `/@fs${projectroot}/zss/device/register.ts`
        )
        registersetmyplayerid(playerid)
        api.vmoperator(register, playerid)
        return 'ok'
      } catch (err) {
        return err instanceof Error ? err.message : String(err)
      }
    },
    { projectroot: root, playerid: bookplayer },
  )
  if (loaded !== 'ok') {
    throw new Error(`bootcafehost operator: ${loaded}`)
  }
  await waitforoperatorset(page, root, bookplayer, 30_000)
  const booksloaded = await page.evaluate(
    async ({ projectroot, data, playerid }) => {
      try {
        const api = await import(`/@fs${projectroot}/zss/device/api.ts`)
        const { register } = await import(
          `/@fs${projectroot}/zss/device/register.ts`
        )
        api.vmbooks(register, playerid, JSON.stringify([data]))
        await new Promise((resolve) => setTimeout(resolve, 2000))
        api.vmlocal(register, playerid)
        return 'ok'
      } catch (err) {
        return err instanceof Error ? err.message : String(err)
      }
    },
    { projectroot: root, data: bookdata, playerid: bookplayer },
  )
  if (booksloaded !== 'ok') {
    throw new Error(`bootcafehost book: ${booksloaded}`)
  }
  console.log(`bootcafehost vmbooks player=${bookplayer} board=${bookboard}`)
  await waitforplayeronboard(page, root, bookplayer, 60_000)
  await page.waitForSelector('canvas', { timeout: 60_000 })
  await focusgame(page)
  await page.keyboard.press('ArrowUp')
  await sleep(500)
  await claimoperator(page, root)
  await waitforactiveplayer(page, root)
  return { bookplayer, bookboard }
}

async function readtapecopy(page: Page, root: string): Promise<string> {
  return page.evaluate(async (projectroot) => {
    try {
      const { useTape } = await import(
        `/@fs${projectroot}/zss/gadget/data/zustandstores.ts`
      )
      const { tokenizeandstriptextformat } = await import(
        `/@fs${projectroot}/zss/words/textformat.ts`
      )
      const logs = useTape.getState().terminal.logs ?? []
      return logs
        .map((row) => tokenizeandstriptextformat(String(row)))
        .join('\n')
    } catch {
      return ''
    }
  }, root)
}

async function waitforoperatorset(
  page: Page,
  root: string,
  playerid: string,
  timeoutms: number,
) {
  const needle = `operator set to ${playerid}`.toLowerCase()
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const buffer = (await readtapecopy(page, root)).toLowerCase()
    if (buffer.includes(needle)) {
      console.log('waitforoperatorset ok')
      return
    }
    await sleep(250)
  }
  throw new Error(`bootcafehost: operator not set to ${playerid}`)
}

async function waitforplayeronboard(
  page: Page,
  root: string,
  playerid: string,
  timeoutms: number,
) {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const state = await page.evaluate(
      async ({ projectroot, player, bookname }) => {
        try {
          const { useTape } = await import(
            `/@fs${projectroot}/zss/gadget/data/zustandstores.ts`
          )
          const { tokenizeandstriptextformat } = await import(
            `/@fs${projectroot}/zss/words/textformat.ts`
          )
          const logs = useTape.getState().terminal.logs ?? []
          const buffer = logs
            .map((row) => tokenizeandstriptextformat(String(row)))
            .join('\n')
            .toLowerCase()
          if (buffer.includes(`login from ${player.toLowerCase()}`)) {
            return 'ready'
          }
          if (
            buffer.includes('need to have an active player on a board') ||
            buffer.includes('need an active player on a board')
          ) {
            return 'noboard'
          }
          if (buffer.includes(`opened [book] ${bookname}`)) {
            return 'book'
          }
          return ''
        } catch {
          return ''
        }
      },
      { projectroot: root, player: playerid, bookname: 'coolregionsbow' },
    )
    if (state === 'ready') {
      console.log('waitforplayeronboard ok')
      return
    }
    if (state === 'noboard') {
      console.log('waitforplayeronboard: still no board (retry vmbooks path)')
    }
    await sleep(500)
  }
  const tail = await readtapecopy(page, root)
  console.log(`tape tail on boot timeout:\n${tail.slice(-1200)}`)
  throw new Error('bootcafehost: player not active on board after book load')
}

async function bindqueue(
  page: Page,
  root: string,
  playerid: string,
  boardid: string,
  peerid: string,
) {
  await runcli(page, `#queue "${peerid}"`, root)
  const bridged = await page.evaluate(
    async ({ projectroot, player, board, helperpeerid }) => {
      try {
        const api = await import(`/@fs${projectroot}/zss/device/api.ts`)
        const { register } = await import(
          `/@fs${projectroot}/zss/device/register.ts`
        )
        api.bridgequeuepanel(register, player, 'bind', {
          canmanage: true,
          peerid: helperpeerid,
          boardid: board,
          boardname: 'coolregionsbow',
        })
        return 'ok'
      } catch (err) {
        return err instanceof Error ? err.message : String(err)
      }
    },
    {
      projectroot: root,
      player: playerid,
      board: boardid,
      helperpeerid: peerid,
    },
  )
  if (bridged !== 'ok') {
    console.log(`bindqueue bridge fallback (${bridged})`)
  } else {
    console.log(`bindqueue ok peer=${peerid}`)
  }
  await sleep(2000)
}

async function addmediaurl(
  page: Page,
  root: string,
  playerid: string,
  url: string,
) {
  const trimmed = url.trim()
  await runcli(page, `#media "${trimmed}"`, root)
  console.log(`addmediaurl ok: ${trimmed}`)
}

async function nudgehostconnect(
  page: Page,
  root: string,
  playerid: string,
  boardid: string,
  peerid: string,
) {
  await focusgame(page)
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowDown')
  await page.mouse.click(400, 300)
  await bindqueue(page, root, playerid, boardid, peerid)
}

async function waittvsinkwithretries(
  page: Page,
  root: string,
  boot: { bookplayer: string; bookboard: string },
  helperpeerid: string,
  timeoutms: number,
  label: string,
) {
  const pertry = Math.floor(timeoutms / 3)
  let lasterror = `${label}: timeout`
  for (let i = 0; i < 3; ++i) {
    try {
      return await waittvsink(page, pertry, label)
    } catch (err) {
      lasterror = err instanceof Error ? err.message : String(err)
      console.log(`${label} retry ${i + 1}/3 (${lasterror})`)
      await nudgehostconnect(
        page,
        root,
        boot.bookplayer,
        boot.bookboard,
        helperpeerid,
      )
      await sleep(3000)
    }
  }
  throw new Error(lasterror)
}

async function claimoperator(page: Page, root: string) {
  const result = await page.evaluate(async (projectroot) => {
    try {
      const api = await import(`/@fs${projectroot}/zss/device/api.ts`)
      const { registerreadplayer } = await import(
        `/@fs${projectroot}/zss/device/registerplayer.ts`
      )
      const { register } = await import(
        `/@fs${projectroot}/zss/device/register.ts`
      )
      const player = registerreadplayer()
      if (!player) {
        return 'no player id'
      }
      api.vmoperator(register, player)
      return 'ok'
    } catch (err) {
      return err instanceof Error ? err.message : String(err)
    }
  }, root)
  if (result !== 'ok') {
    console.log(`claimoperator: ${result}`)
  } else {
    console.log('claimoperator ok')
  }
  await sleep(1000)
}

async function waitforactiveplayer(page: Page, root: string) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    const state = await page.evaluate(async (projectroot) => {
      try {
        const { registerreadplayer } = await import(
          `/@fs${projectroot}/zss/device/registerplayer.ts`
        )
        const player = registerreadplayer()
        return player ? 'ready' : ''
      } catch {
        return ''
      }
    }, root)
    if (state === 'ready') {
      return
    }
    await sleep(500)
  }
  console.log('waitforactiveplayer: timed out (continuing)')
}

type Stage =
  | 'spawn_helper'
  | 'host_bind'
  | 'join_connect'
  | 'host_stream'
  | 'join_stream'
  | 'render'

function failstage(stage: Stage, message: string): never {
  throw new Error(`${stage}: ${message}`)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pollfile(
  filepath: string,
  timeoutms: number,
  predicate: (text: string) => boolean,
): Promise<string> {
  const deadline = Date.now() + timeoutms
  let last = ''
  while (Date.now() < deadline) {
    if (fs.existsSync(filepath)) {
      last = fs.readFileSync(filepath, 'utf8').trim()
      if (predicate(last)) {
        return last
      }
    }
    await sleep(250)
  }
  throw new Error(`poll timeout for ${filepath} last=${JSON.stringify(last)}`)
}

async function pollplayingstatus(
  statusfile: string,
  timeoutms: number,
): Promise<string> {
  const deadline = Date.now() + timeoutms
  let last = ''
  let lastlog = 0
  while (Date.now() < deadline) {
    if (fs.existsSync(statusfile)) {
      last = fs.readFileSync(statusfile, 'utf8').trim()
      if (
        last.startsWith('error|') ||
        last.includes('download-failed') ||
        last.includes('playback-failed')
      ) {
        throw new Error(`helper media failed: ${last}`)
      }
      if (last.startsWith('playing|')) {
        return last
      }
      if (Date.now() - lastlog > 15_000 && last) {
        console.log(`helper status=${last}`)
        lastlog = Date.now()
      }
    }
    await sleep(500)
  }
  throw new Error(`poll timeout for ${statusfile} last=${JSON.stringify(last)}`)
}

const HELPER_PID_REGISTRY = path.join(os.tmpdir(), 'mq-tvsink-helper-pids.json')

function readhelperpidregistry(): number[] {
  try {
    const raw = fs.readFileSync(HELPER_PID_REGISTRY, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value > 0,
    )
  } catch {
    return []
  }
}

function writehelperpidregistry(pids: number[]) {
  fs.writeFileSync(HELPER_PID_REGISTRY, JSON.stringify(pids))
}

function killregisteredhelpers() {
  const pids = readhelperpidregistry()
  if (pids.length === 0) {
    return
  }
  console.log(`kill ${pids.length} stray headed helper process(es)`)
  for (let i = 0; i < pids.length; ++i) {
    killpid(pids[i], 'SIGTERM')
  }
  for (let i = 0; i < pids.length; ++i) {
    killpid(pids[i], 'SIGKILL')
  }
  writehelperpidregistry([])
}

function registerhelperpid(pid: number) {
  const pids = readhelperpidregistry()
  if (!pids.includes(pid)) {
    pids.push(pid)
  }
  writehelperpidregistry(pids)
}

function unregisterhelperpid(pid: number | undefined) {
  if (!pid) {
    return
  }
  writehelperpidregistry(readhelperpidregistry().filter((entry) => entry !== pid))
}

function helperelectronbin(root: string): string {
  return path.join(
    root,
    'ops/media-queue/node_modules/.bin',
    process.platform === 'win32' ? 'electron.cmd' : 'electron',
  )
}

function killpid(pid: number, signal: NodeJS.Signals) {
  if (process.platform === 'win32') {
    try {
      process.kill(pid, signal)
    } catch {
      // ignore
    }
    return
  }
  try {
    process.kill(-pid, signal)
  } catch {
    try {
      process.kill(pid, signal)
    } catch {
      // ignore
    }
  }
}

function killlastheadedhelper() {
  killregisteredhelpers()
}

function rememberhelperpid(pid: number | undefined) {
  if (!pid || pid <= 0) {
    return
  }
  registerhelperpid(pid)
}

function clearrememberedhelperpid(pid: number | undefined) {
  unregisterhelperpid(pid)
}

async function killhelper(child: ChildProcess | undefined) {
  const pid = child?.pid
  if (!child || child.killed) {
    clearrememberedhelperpid(pid)
    return
  }
  if (pid) {
    killpid(pid, 'SIGTERM')
  } else {
    try {
      child.kill('SIGTERM')
    } catch {
      // ignore
    }
  }
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if (child.killed || child.exitCode !== null) {
      clearrememberedhelperpid(pid)
      return
    }
    await sleep(200)
  }
  if (pid) {
    killpid(pid, 'SIGKILL')
  } else {
    try {
      child.kill('SIGKILL')
    } catch {
      // ignore
    }
  }
  clearrememberedhelperpid(pid)
}

async function startfixtureserver(
  root: string,
): Promise<{ url: string; close: () => Promise<void> }> {
  const fixturepath = path.join(root, 'ops/fixtures/media/test.mp4')
  if (!fs.existsSync(fixturepath)) {
    throw new Error(`missing fixture ${fixturepath}`)
  }
  const bytes = fs.readFileSync(fixturepath)
  const server: Server = createServer((req, res) => {
    if (req.url === '/test.mp4' || req.url === '/') {
      res.writeHead(200, { 'content-type': 'video/mp4' })
      res.end(bytes)
      return
    }
    res.writeHead(404)
    res.end('not found')
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const addr = server.address()
  if (!addr || typeof addr === 'string') {
    throw new Error('fixture server bind failed')
  }
  return {
    url: `http://127.0.0.1:${addr.port}/test.mp4`,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve())
      }),
  }
}

async function focusgame(page: Page) {
  await page.evaluate(() => {
    window.focus()
  })
  const box = await page.locator('#frame').boundingBox()
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  } else {
    await page.click('body')
  }
}

async function runterminalcommand(page: Page, line: string) {
  await focusgame(page)
  await page.keyboard.press('Escape')
  await sleep(300)
  const trimmed = line.trim()
  if (trimmed.startsWith('#')) {
    await page.keyboard.press('3')
    await page.keyboard.type(trimmed.slice(1), { delay: 20 })
  } else {
    await page.keyboard.type(trimmed, { delay: 20 })
  }
  await page.keyboard.press('Enter')
  await sleep(1500)
}

async function runcli(page: Page, line: string, root: string) {
  const result = await page.evaluate(
    async ({ cmd, projectroot }) => {
      try {
        const api = await import(`/@fs${projectroot}/zss/device/api.ts`)
        const { registerreadplayer } = await import(
          `/@fs${projectroot}/zss/device/registerplayer.ts`
        )
        const { register } = await import(
          `/@fs${projectroot}/zss/device/register.ts`
        )
        api.vmcli(register, registerreadplayer(), cmd)
        return 'ok'
      } catch (err) {
        return err instanceof Error ? err.message : String(err)
      }
    },
    { cmd: line, projectroot: root },
  )
  if (result !== 'ok') {
    console.log(`runcli keyboard fallback (${result}): ${line}`)
    await runterminalcommand(page, line)
  } else {
    console.log(`runcli ok: ${line}`)
    await sleep(2000)
  }
}

async function startjoinhost(page: Page, root: string) {
  await runcli(page, '#joincode', root)
  await sleep(8000)
}

function parsejoinurl(raw: string, baseurl: string): string {
  const trimmed = raw.trim()
  const absolute = trimmed.match(/https?:\/\/[^\s]+\/join\/#[A-Za-z0-9-]+/)
  if (absolute) {
    return absolute[0]
  }
  const relative = trimmed.match(/\/join\/#[A-Za-z0-9-]+/)
  if (relative) {
    return `${new URL(baseurl).origin}${relative[0]}`
  }
  return ''
}

async function computejoinurl(
  page: Page,
  baseurl: string,
  root: string,
): Promise<string> {
  const topic = await page.evaluate(async (projectroot) => {
    try {
      const { registerreadplayer } = await import(
        `/@fs${projectroot}/zss/device/registerplayer.ts`
      )
      const { storagereadnetid } = await import(
        `/@fs${projectroot}/zss/feature/storage.ts`
      )
      const { createinfohash } = await import(
        `/@fs${projectroot}/zss/mapping/guid.ts`
      )
      const player = registerreadplayer()
      if (!player) {
        return ''
      }
      const netid = await storagereadnetid()
      const stickypeerid = (netid ?? '') || player
      return createinfohash(stickypeerid)
    } catch (err) {
      return err instanceof Error ? err.message : String(err)
    }
  }, root)
  if (!topic || topic.includes(' ')) {
    if (topic) {
      console.log(`computejoinurl error: ${topic}`)
    }
    return ''
  }
  console.log(`join topic=${topic}`)
  return `${new URL(baseurl).origin}/join/#${topic}`
}

async function readjoinurl(
  page: Page,
  baseurl: string,
  root: string,
): Promise<string> {
  const computed = await computejoinurl(page, baseurl, root)
  if (computed) {
    return computed
  }
  const clip = await page.evaluate(async () => {
    try {
      return await navigator.clipboard.readText()
    } catch {
      return ''
    }
  })
  return parsejoinurl(clip, baseurl)
}

async function waitforjoinurl(
  page: Page,
  baseurl: string,
  root: string,
  timeoutms: number,
): Promise<string> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const url = await readjoinurl(page, baseurl, root)
    if (url) {
      return url
    }
    await sleep(500)
  }
  failstage('host_bind', 'join url not found (player id or clipboard)')
}

async function runflow(ctx: HeadedPlaywrightContext) {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'mq-tvsink-'))
  const peeridfile = path.join(tmpdir, 'peer-id.txt')
  const statusfile = path.join(tmpdir, 'status.txt')
  const fixturepath = path.join(ctx.root, 'ops/fixtures/media/test.mp4')
  const mediasource = resolvemediaurl()

  let helper: ChildProcess | undefined
  let fixtureserver: { url: string; close: () => Promise<void> } | undefined

  try {
    if (mediasource.usedevfixture) {
      fixtureserver = await startfixtureserver(ctx.root)
      console.log(`media source=local fixture ${fixturepath}`)
    } else {
      console.log(`media source=ytdlp url=${mediasource.mediaurl}`)
    }

    killlastheadedhelper()

    console.log('stage=spawn_helper')
    const helpercwd = path.join(ctx.root, 'ops/media-queue')
    const helperenv = { ...process.env }
    delete helperenv.ELECTRON_RUN_AS_NODE
    helperenv.MQ_PEER_ID_FILE = peeridfile
    helperenv.MQ_NETID_FILE = path.join(tmpdir, 'mq-netid.txt')
    if (mediasource.usedevfixture) {
      helperenv.MQ_DEV_PLAYBACK_PATH = fixturepath
    } else {
      delete helperenv.MQ_DEV_PLAYBACK_PATH
      helperenv.MQ_COOKIES_BROWSER =
        process.env.MQ_COOKIES_BROWSER?.trim().toLowerCase() || 'chrome'
      console.log(`youtube cookies=${helperenv.MQ_COOKIES_BROWSER}`)
    }
    helperenv.MQ_STATUS_TEXT_FILE = statusfile
    helper = spawn(helperelectronbin(ctx.root), ['.'], {
      cwd: helpercwd,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: helperenv,
    })
    rememberhelperpid(helper.pid)
    helper.stdout?.on('data', (chunk) => {
      const text = String(chunk).trim()
      if (text) {
        console.log(`helper: ${text}`)
      }
    })
    helper.stderr?.on('data', (chunk) => {
      const text = String(chunk).trim()
      if (text) {
        console.error(`helper: ${text}`)
      }
    })

    const helperpeerid = await pollfile(
      peeridfile,
      HELPER_SPAWN_TIMEOUT_MS,
      (text) => text.length > 4,
    )
    console.log(`helper peer id=${helperpeerid}`)

    const browser = ctx.browser
    const hostcontext = await browser.newContext({ ignoreHTTPSErrors: true })
    await hostcontext.grantPermissions(['clipboard-read', 'clipboard-write'])
    await hostcontext.grantPermissions(
      ['camera', 'microphone'],
      { origin: ctx.baseurl },
    )
    await hostcontext.exposeFunction('__mqheadedlog', (msg: string) => {
      console.log(`cafe: ${msg}`)
    })
    const hostpage = await hostcontext.newPage()
    hostpage.setDefaultTimeout(PARITY_RENDER_SCRIPT_TIMEOUT_MS)
    hostpage.on('console', (msg) => {
      const text = msg.text()
      if (
        text.includes('mediaqueue') ||
        text.includes('login from') ||
        text.startsWith('cafe:')
      ) {
        console.log(`browser: ${text}`)
      }
    })

    console.log('stage=host_bind')
    const boot = await bootcafehost(hostpage, ctx.baseurl, ctx.root)

    for (let attempt = 0; attempt < 3; ++attempt) {
      await startjoinhost(hostpage, ctx.root)
      const joinmatch = await waitforjoinurl(
        hostpage,
        ctx.baseurl,
        ctx.root,
        attempt === 0 ? JOIN_HOST_READY_MS : HOST_BIND_TIMEOUT_MS / 2,
      ).catch(() => '')
      if (joinmatch) {
        console.log(`join url=${joinmatch}`)
        let queuebound = false
        for (let queueattempt = 0; queueattempt < 5; ++queueattempt) {
          await bindqueue(
            hostpage,
            ctx.root,
            boot.bookplayer,
            boot.bookboard,
            helperpeerid,
          )
          try {
            await pollfile(
              statusfile,
              25_000,
              (text) =>
                text.startsWith('connected|') || text.startsWith('playing|'),
            )
            queuebound = true
            break
          } catch {
            console.log(`queue bind retry ${queueattempt + 1}/5`)
            await claimoperator(hostpage, ctx.root)
            await sleep(3000)
          }
        }
        if (!queuebound) {
          failstage('host_bind', 'helper never accepted queue data connection')
        }
        await pollfile(
          statusfile,
          90_000,
          (text) =>
            text.startsWith('connected|data open') ||
            text.startsWith('playing|'),
        )
        console.log('helper data channel open')
        await addmediaurl(
          hostpage,
          ctx.root,
          boot.bookplayer,
          mediasource.usedevfixture
            ? fixtureserver!.url
            : mediasource.mediaurl,
        )
        await pollplayingstatus(statusfile, mediasource.downloadtimeoutms)
        const statusaftermedia = fs.existsSync(statusfile)
          ? fs.readFileSync(statusfile, 'utf8').trim()
          : ''
        console.log(`helper status after media=${statusaftermedia}`)
        try {
          await pollfile(
            statusfile,
            60_000,
            (text) => /playing\|[1-9]/.test(text),
          )
          console.log('helper has player stream connection')
        } catch {
          console.log('helper still reports 0 player(s) before host_stream assert')
        }
        await focusgame(hostpage)
        await hostpage.keyboard.press('ArrowUp')
        await sleep(2000)

        console.log('stage=host_stream')
        await waittvsinkwithretries(
          hostpage,
          ctx.root,
          boot,
          helperpeerid,
          STREAM_ASSERT_TIMEOUT_MS,
          'host_stream',
        )

        console.log('stage=join_connect')
        const joincontext = await browser.newContext({
          ignoreHTTPSErrors: true,
        })
        await joincontext.grantPermissions(['clipboard-read', 'clipboard-write'])
        const joinpage = await joincontext.newPage()
        joinpage.setDefaultTimeout(PARITY_RENDER_SCRIPT_TIMEOUT_MS)
        await joinpage.goto(joinmatch, {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        })
        await joinpage.waitForSelector('#frame', { timeout: 60_000 })
        await sleep(BOOT_WAIT_MS)

        await pollfile(
          statusfile,
          JOIN_CONNECT_TIMEOUT_MS,
          (text) => text.includes('2 player'),
        )

        console.log('stage=join_stream')
        await waittvsink(joinpage, STREAM_ASSERT_TIMEOUT_MS, 'join_stream')

        console.log('stage=render ok')
        return
      }
    }

    const clip = await readjoinurl(hostpage, ctx.baseurl, ctx.root)
    failstage(
      'host_bind',
      `join url not found after retries (clipboard=${JSON.stringify(clip)})`,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(message)
    throw err
  } finally {
    await killhelper(helper)
    if (fixtureserver) {
      await fixtureserver.close()
    }
    try {
      fs.rmSync(tmpdir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
}

export default async function tvsinkheaded(ctx: HeadedPlaywrightContext) {
  const mediasource = resolvemediaurl()
  const scripttimeoutms =
    mediasource.downloadtimeoutms + SCRIPT_TIMEOUT_MS - HOST_BIND_TIMEOUT_MS
  await withscripttimeout('mq-tvsink-headed', scripttimeoutms, () =>
    runflow(ctx),
  )
}
