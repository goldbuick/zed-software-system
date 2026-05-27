#!/usr/bin/env npx tsx
/**
 * Regenerate WASM parity reference metrics (committed fixtures).
 *
 * Renders each patch via WASM offline audio in headless Chromium, then writes
 * `zss/feature/synth/backend/wasm/__fixtures__/parity-metrics.json`.
 *
 * Usage:
 *   yarn regen:parity-fixtures
 */
import http from 'node:http'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import { createServer as createViteServer } from 'vite'

import { WASM_PARITY_PATCHES } from '../zss/feature/synth/backend/wasm/paritypatches.ts'
import type { PARITY_AUDIO_METRICS } from '../zss/feature/synth/backend/wasm/paritymetrics.ts'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const OUT = path.join(
  PROJECT,
  'zss/feature/synth/backend/wasm/__fixtures__/parity-metrics.json',
)
const REGEN_PORT = 9876

function metricsusable(metrics: PARITY_AUDIO_METRICS): boolean {
  return metrics.rmsdb > -119
}

function loadexisting(): Record<string, PARITY_AUDIO_METRICS> {
  try {
    const raw = readFileSync(OUT, 'utf8')
    const parsed = JSON.parse(raw) as { patches: Record<string, PARITY_AUDIO_METRICS> }
    return parsed.patches ?? {}
  } catch {
    return {}
  }
}

async function startregenserver() {
  const vite = await createViteServer({
    root: PROJECT,
    publicDir: path.join(PROJECT, 'cafe/public'),
    resolve: {
      alias: {
        zss: path.join(PROJECT, 'zss'),
        cafe: path.join(PROJECT, 'cafe'),
      },
    },
    server: {
      middlewareMode: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    appType: 'spa',
  })

  const server = http.createServer((req, res) => {
    vite.middlewares.handle(req, res, () => {
      res.statusCode = 404
      res.end('not found')
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(REGEN_PORT, '127.0.0.1', resolve)
  })

  return { server, vite }
}

async function renderpatchmetrics(
  page: import('@playwright/test').Page,
  patchid: string,
): Promise<PARITY_AUDIO_METRICS> {
  const url = `http://127.0.0.1:${REGEN_PORT}/parity-regen.html?patch=${encodeURIComponent(patchid)}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 })
  await page.waitForFunction(() => {
    const el = document.getElementById('out')
    return el && el.textContent && !el.textContent.startsWith('rendering')
  }, { timeout: 180000 })
  const body = await page.locator('#out').textContent()
  if (!body) {
    throw new Error(`empty parity regen response for ${patchid}`)
  }
  const parsed = JSON.parse(body) as Record<string, PARITY_AUDIO_METRICS>
  const metrics = parsed[patchid]
  if (!metrics) {
    throw new Error(`missing metrics for ${patchid}`)
  }
  return metrics
}

async function renderwasmpatches(): Promise<Record<string, PARITY_AUDIO_METRICS>> {
  const { server, vite } = await startregenserver()
  const browser = await chromium.launch()
  const out: Record<string, PARITY_AUDIO_METRICS> = {}
  try {
    const page = await browser.newPage()
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`browser [${msg.text()}]`)
      }
    })
    page.on('pageerror', (err) => {
      console.error('pageerror:', err.message)
    })
    for (const patch of WASM_PARITY_PATCHES) {
      out[patch.id] = await renderpatchmetrics(page, patch.id)
    }
    return out
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await vite.close()
  }
}

async function main() {
  const existing = loadexisting()
  const patches: Record<string, PARITY_AUDIO_METRICS> = { ...existing }
  const rendered = await renderwasmpatches()
  for (const patch of WASM_PARITY_PATCHES) {
    const metrics = rendered[patch.id]
    if (!metrics) {
      console.warn(`skip ${patch.id} — wasm render missing`)
      continue
    }
    if (!metricsusable(metrics)) {
      if (existing[patch.id]) {
        console.warn(`keep ${patch.id} — wasm render silent`)
        continue
      }
      console.warn(`skip ${patch.id} — wasm render silent and no existing fixture`)
      continue
    }
    patches[patch.id] = metrics
    console.log(`wasm ${patch.id}`, metrics)
  }
  if (Object.keys(patches).length === 0) {
    console.error('No patches rendered — ensure playwright chromium is installed.')
    process.exit(1)
  }
  writeFileSync(OUT, `${JSON.stringify({ patches }, null, 2)}\n`)
  console.log(`wrote ${OUT}`)
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
