import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ensureservercerts, installtrust, userdata } from './tls.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../..')
const require = createRequire(path.join(root, 'package.json'))
const { chromium } = require('playwright')

const PORT = Number(process.env.REMOTE_BROWSER_PORT || 8890)
const HOST = '127.0.0.1'
const EXTENSION_DIR = path.resolve(here, '../extension')
const VIEWPORT = { width: 1280, height: 720 }

const corsheaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
}

function loadorcreatebearer() {
  const dir = userdata()
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'bearer.txt')
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, 'utf8').trim()
    if (existing) {
      return existing
    }
  }
  const bearer = randomBytes(16).toString('hex')
  fs.writeFileSync(file, `${bearer}\n`, 'utf8')
  return bearer
}

function readbearer(req) {
  const header = String(req.headers.authorization || '')
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1].trim() : ''
}

function send(res, status, body, extra = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  const type =
    typeof body === 'string' && !extra['Content-Type']
      ? extra.sdp
        ? 'application/sdp'
        : 'text/plain; charset=utf-8'
      : 'application/json; charset=utf-8'
  res.writeHead(status, {
    ...corsheaders,
    'Content-Type': extra['Content-Type'] || type,
    ...extra,
  })
  res.end(payload)
}

function readbody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    const timer = setTimeout(() => {
      reject(new Error('body timeout'))
      req.destroy()
    }, 15000)
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        clearTimeout(timer)
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      clearTimeout(timer)
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

async function launchbrowser() {
  const userdatadir = path.join(userdata(), 'chrome-profile')
  fs.mkdirSync(userdatadir, { recursive: true })
  const opts = {
    headless: false,
    viewport: VIEWPORT,
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
    ignoreDefaultArgs: ['--disable-component-extensions-with-background-pages'],
  }
  if (process.env.PLAYWRIGHT_CHANNEL) {
    opts.channel = process.env.PLAYWRIGHT_CHANNEL
  }
  return chromium.launchPersistentContext(userdatadir, opts)
}

async function waitforserviceworker(context) {
  const existing = context.serviceWorkers()
  if (existing[0]) {
    return existing[0]
  }
  return context.waitForEvent('serviceworker', { timeout: 30000 })
}

async function opencapturepage(context, worker) {
  const match = /chrome-extension:\/\/([^/]+)/.exec(worker.url())
  if (!match) {
    throw new Error('extension id missing from service worker url')
  }
  const captureurl = `chrome-extension://${match[1]}/capture.html`
  const page = await context.newPage()
  await page.goto(captureurl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  return page
}

async function startcapture(capturepage) {
  return capturepage.evaluate(async () => {
    return window.__cafecapture.startcapture()
  })
}

async function main() {
  const certs = ensureservercerts()
  installtrust(certs.cert)
  const bearer = loadorcreatebearer()

  console.log('starting headed chromium with tab capture extension...')
  const context = await launchbrowser()
  let contentpage = context.pages()[0]
  if (!contentpage) {
    contentpage = await context.newPage()
  }
  await contentpage.setViewportSize(VIEWPORT)
  await contentpage.goto('about:blank')

  const worker = await waitforserviceworker(context)
  const capturepage = await opencapturepage(context, worker)
  try {
    const tracks = await startcapture(capturepage)
    console.log(
      `tab capture started audio=${tracks.audio} video=${tracks.video}`,
    )
  } catch (err) {
    console.warn(`tab capture start failed: ${err.message}`)
  }

  const key = fs.readFileSync(certs.key)
  const cert = fs.readFileSync(certs.cert)

  const server = https.createServer({ key, cert }, (req, res) => {
    void handle(req, res)
  })

  async function handle(req, res) {
    const url = new URL(req.url || '/', `https://${HOST}:${PORT}`)
    if (req.method === 'OPTIONS') {
      send(res, 204, '')
      return
    }
    if (readbearer(req) !== bearer) {
      send(res, 401, { error: 'unauthorized' })
      return
    }
    try {
      if (req.method === 'GET' && url.pathname === '/status') {
        const title = await contentpage.title()
        const capturing = await capturepage.evaluate(() =>
          window.__cafecapture.capturing(),
        )
        send(res, 200, {
          url: contentpage.url(),
          title,
          capturing,
          whep: `https://${HOST}:${PORT}/whep`,
        })
        return
      }
      if (req.method === 'POST' && url.pathname === '/goto') {
        const body = JSON.parse(await readbody(req))
        const target = String(body.url || '').trim()
        if (!target) {
          send(res, 400, { error: 'url required' })
          return
        }
        await contentpage.goto(target, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        })
        try {
          await startcapture(capturepage)
        } catch (err) {
          console.warn(`tab capture refresh failed: ${err.message}`)
        }
        send(res, 200, { url: contentpage.url() })
        return
      }
      if (req.method === 'POST' && url.pathname === '/click') {
        const body = JSON.parse(await readbody(req))
        const x = Number(body.x)
        const y = Number(body.y)
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          send(res, 400, { error: 'x y required' })
          return
        }
        await contentpage.mouse.click(x, y)
        send(res, 200, { ok: true })
        return
      }
      if (req.method === 'POST' && url.pathname === '/type') {
        const body = JSON.parse(await readbody(req))
        await contentpage.keyboard.type(String(body.text ?? ''), { delay: 20 })
        send(res, 200, { ok: true })
        return
      }
      if (req.method === 'POST' && url.pathname === '/back') {
        await contentpage.goBack({ timeout: 15000 })
        send(res, 200, { url: contentpage.url() })
        return
      }
      if (req.method === 'POST' && url.pathname === '/whep') {
        const sdp = await readbody(req)
        if (!sdp.trim()) {
          send(res, 400, { error: 'sdp required' })
          return
        }
        const answer = await capturepage.evaluate(async (offer) => {
          return window.__cafecapture.whepoffer(offer)
        }, sdp)
        send(res, 201, answer, {
          'Content-Type': 'application/sdp',
          Location: `https://${HOST}:${PORT}/whep`,
        })
        return
      }
      if (req.method === 'DELETE' && url.pathname === '/whep') {
        await capturepage.evaluate(() => window.__cafecapture.stopwhep())
        send(res, 200, { ok: true })
        return
      }
      send(res, 404, { error: 'not found' })
    } catch (err) {
      send(res, 500, { error: err instanceof Error ? err.message : String(err) })
    }
  }

  await new Promise((resolve) => {
    server.listen(PORT, HOST, resolve)
  })

  console.log(`remote browser listening on https://${HOST}:${PORT}`)
  console.log(`whep: https://${HOST}:${PORT}/whep`)
  console.log(`bearer: ${bearer}`)
  console.log('in cafe: #browser attach <bearer> then #browser watch')
  console.log('or: #media whep browser <bearer>')
  console.log(`trust cert if needed: ${certs.cert}`)

  const shutdown = async () => {
    server.close()
    await context.close()
    process.exit(0)
  }
  process.on('SIGINT', () => {
    void shutdown()
  })
  process.on('SIGTERM', () => {
    void shutdown()
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
