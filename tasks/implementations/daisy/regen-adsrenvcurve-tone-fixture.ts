import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  launchparitybrowser,
  parityhosturl,
} from 'tasks/lib/parity/parity-playwright.ts'
import {
  startparityvite,
  stopparityvite,
} from 'tasks/lib/parity/parity-vite-server.ts'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const OUT = path.join(
  PROJECT,
  'ops/fixtures/synth/wasm/adsrenvcurve-tone-metrics.json',
)
const PORT = 9885

async function main() {
  const parity = await startparityvite(PROJECT, PORT)
  const browser = await launchparitybrowser()
  try {
    const page = await browser.newPage()
    page.on('pageerror', (err) => {
      console.error('pageerror:', err.message)
    })
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('browser:', msg.text())
      }
    })
    page.setDefaultTimeout(120_000)
    await page.goto(parityhosturl(PORT), {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })
    const parsed = await page.evaluate(async () => {
      const { runadsrenvcurveregen } =
        await import('/ops/lib/daisy-parity/adsrenvcurve-regen-runner.ts')
      return runadsrenvcurveregen()
    })
    writeFileSync(OUT, `${JSON.stringify(parsed, null, 2)}\n`)
    console.log(`wrote ${OUT}`)
  } finally {
    await browser.close()
    await stopparityvite(parity)
  }
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
