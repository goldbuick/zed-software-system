/**
 * Headed media-queue TV sink proof (host + join).
 *
 * Prereq: cafe dev server on --url (default http://localhost:7777)
 *
 * yarn task run cafe:playwright:headed https://localhost:7777 ops/lib/mediaqueue-parity/tvsink-headed.ts
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

function killchild(child: ChildProcess | undefined) {
  if (!child || child.killed) {
    return
  }
  try {
    child.kill('SIGTERM')
  } catch {
    // ignore
  }
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

async function runterminalcommand(page: Page, line: string) {
  await page.click('#frame', { timeout: 30_000 })
  await page.keyboard.press('Escape')
  await sleep(200)
  const trimmed = line.trim()
  if (trimmed.startsWith('#')) {
    await page.keyboard.press('#')
    await page.keyboard.type(trimmed.slice(1))
  } else {
    await page.keyboard.type(trimmed)
  }
  await page.keyboard.press('Enter')
}

async function waitforbodymatch(
  page: Page,
  pattern: RegExp,
  timeoutms: number,
  label: string,
): Promise<string> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const text = await page.evaluate(() => document.body.innerText || '')
    const match = text.match(pattern)
    if (match) {
      return match[0]
    }
    await sleep(500)
  }
  failstage(label as Stage, `pattern ${pattern} not found`)
}

async function runflow(ctx: HeadedPlaywrightContext) {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'mq-tvsink-'))
  const peeridfile = path.join(tmpdir, 'peer-id.txt')
  const statusfile = path.join(tmpdir, 'status.txt')
  const fixturepath = path.join(ctx.root, 'ops/fixtures/media/test.mp4')

  let helper: ChildProcess | undefined
  let fixtureserver: { url: string; close: () => Promise<void> } | undefined

  try {
    fixtureserver = await startfixtureserver(ctx.root)

    console.log('stage=spawn_helper')
    const helpercwd = path.join(ctx.root, 'ops/media-queue')
    helper = spawn('node', ['scripts/run-electron.mjs'], {
      cwd: helpercwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MQ_PEER_ID_FILE: peeridfile,
        MQ_DEV_PLAYBACK_PATH: fixturepath,
        MQ_STATUS_TEXT_FILE: statusfile,
      },
    })
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
    const hostpage = await hostcontext.newPage()
    hostpage.setDefaultTimeout(PARITY_RENDER_SCRIPT_TIMEOUT_MS)

    console.log('stage=host_bind')
    await hostpage.goto(ctx.baseurl, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await hostpage.waitForSelector('#frame', { timeout: 60_000 })
    await sleep(3000)
    await runterminalcommand(hostpage, '#joincode')
    await waitforbodymatch(
      hostpage,
      /\/join\/#[A-Za-z0-9-]+/,
      HOST_BIND_TIMEOUT_MS,
      'host_bind',
    )
    const joinmatch = await hostpage.evaluate(() => {
      const text = document.body.innerText || ''
      const m = text.match(/https?:\/\/[^\s]+\/join\/#[A-Za-z0-9-]+/)
      if (m) {
        return m[0]
      }
      const rel = text.match(/\/join\/#[A-Za-z0-9-]+/)
      if (rel) {
        return `${location.origin}${rel[0]}`
      }
      return ''
    })
    if (!joinmatch) {
      failstage('host_bind', 'join url not found on host tape')
    }
    console.log(`join url=${joinmatch}`)

    await runterminalcommand(hostpage, `#queue ${helperpeerid}`)
    await waitforbodymatch(
      hostpage,
      /mediaqueue helper:/i,
      HOST_BIND_TIMEOUT_MS,
      'host_bind',
    )

    await runterminalcommand(hostpage, `#media ${fixtureserver.url}`)
    await pollfile(
      statusfile,
      HOST_BIND_TIMEOUT_MS,
      (text) => text.startsWith('playing|') && !text.includes('0 player'),
    )

    console.log('stage=host_stream')
    await waittvsink(hostpage, STREAM_ASSERT_TIMEOUT_MS, 'host_stream')

    console.log('stage=join_connect')
    const joincontext = await browser.newContext({ ignoreHTTPSErrors: true })
    const joinpage = await joincontext.newPage()
    joinpage.setDefaultTimeout(PARITY_RENDER_SCRIPT_TIMEOUT_MS)
    await joinpage.goto(joinmatch, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await joinpage.waitForSelector('#frame', { timeout: 60_000 })
    await sleep(5000)

    await pollfile(
      statusfile,
      JOIN_CONNECT_TIMEOUT_MS,
      (text) => text.includes('2 player'),
    )

    console.log('stage=join_stream')
    await waittvsink(joinpage, STREAM_ASSERT_TIMEOUT_MS, 'join_stream')

    console.log('stage=render ok')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(message)
    throw err
  } finally {
    killchild(helper)
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
  await withscripttimeout('mq-tvsink-headed', SCRIPT_TIMEOUT_MS, () =>
    runflow(ctx),
  )
}
