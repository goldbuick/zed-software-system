#!/usr/bin/env node
/**
 * Bundle Emscripten glue + DaisyProcessor into a classic AudioWorklet script.
 * Firefox needs addModule(url) without { type: 'module' } (see maximilian).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outdir = path.join(root, 'cafe/public/wasm/daisy')
const gluepath = path.join(outdir, 'zss_daisy.js')
const workletpath = path.join(
  root,
  'zss/feature/synth/backend/daisy/daisy-processor.worklet.js',
)
const outpath = path.join(outdir, 'daisy-processor.js')

const glue = fs
  .readFileSync(gluepath, 'utf8')
  .replace(/export default ZssDaisy;?\s*$/, '')
  .replaceAll('import.meta.url', '""')
  .replace(
    /return new URL\("zss_daisy\.wasm",""\)\.href/,
    'throw new Error("wasmBinary required in worklet")',
  )
  .replace('var wasmExports=createWasm()', 'var wasmExports;createWasm()')
const worklet = fs.readFileSync(workletpath, 'utf8')

const bundled = `/**
 * GENERATED — do not edit. Run \`yarn bundle:daisy-processor\`.
 * Classic AudioWorklet bundle (Emscripten glue + DaisyProcessor).
 */
${glue}
${worklet}
`

fs.writeFileSync(outpath, bundled)
console.log(`✓ ${outpath} (${bundled.length} bytes)`)
