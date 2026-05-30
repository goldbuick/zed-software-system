#!/usr/bin/env npx tsx
/**
 * Bundle Emscripten glue + DaisyProcessor into a classic AudioWorklet script.
 * Injects SAB layout from daisycontrol.ts so worklet offsets stay aligned with C++.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { formatdaisyworkletsablayout } from '../zss/feature/synth/backend/daisy/daisycontrol'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outdir = path.join(root, 'cafe/public/wasm/daisy')
const gluepath = path.join(outdir, 'zss_daisy.js')
const workletpath = path.join(
  root,
  'zss/feature/synth/backend/daisy/daisy-processor.worklet.js',
)
const outpath = path.join(outdir, 'daisy-processor.js')

const layoutstart = '// @generated-start daisy-sab-layout'
const layoutend = '// @generated-end daisy-sab-layout'
const layoutblock = `${layoutstart}\n${formatdaisyworkletsablayout()}${layoutend}`

function injectworkletsablayout(source: string): string {
  const start = source.indexOf(layoutstart)
  const end = source.indexOf(layoutend)
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('daisy-processor.worklet.js missing daisy-sab-layout markers')
  }
  const before = source.slice(0, start)
  const after = source.slice(end + layoutend.length)
  return `${before}${layoutblock}${after}`
}

const glue = fs
  .readFileSync(gluepath, 'utf8')
  .replace(/export default ZssDaisy;?\s*$/, '')
  .replaceAll('import.meta.url', '""')
  .replace(
    /return new URL\("zss_daisy\.wasm",""\)\.href/,
    'throw new Error("wasmBinary required in worklet")',
  )
  .replace('var wasmExports=createWasm()', 'var wasmExports;createWasm()')

const workletraw = fs.readFileSync(workletpath, 'utf8')
const worklet = injectworkletsablayout(workletraw)
if (worklet !== workletraw) {
  fs.writeFileSync(workletpath, worklet)
}

const bundled = `/**
 * GENERATED — do not edit. Run \`yarn bundle:daisy-processor\`.
 * Classic AudioWorklet bundle (Emscripten glue + DaisyProcessor).
 */
${glue}
${worklet}
`

fs.writeFileSync(outpath, bundled)
console.log(`✓ ${outpath} (${bundled.length} bytes)`)

const buildidpath = path.join(
  root,
  'zss/feature/synth/backend/daisy/daisybuildid.ts',
)
const buildid = String(Math.floor(Date.now() / 1000))
fs.writeFileSync(
  buildidpath,
  `/** Bumped by \`yarn build:daisy\` — busts browser cache when wasm changes on same commit. */
export const DAISY_BUILD_ID = '${buildid}'
`,
)
console.log(`✓ ${buildidpath} (${buildid})`)
