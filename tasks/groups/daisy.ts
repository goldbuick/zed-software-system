import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'
import { def, exec, handler, jestexec, shell, tasksonly } from '../helpers'
import { parityfull } from '../pipelines'
import { runclangformat } from './native'
import { loaddaisyparityruntime } from 'tasks/lib/daisy/parity-runtime'
import type { TaskContext, TaskDef } from '../types'

// --- bundle-daisy-processor.ts ---
async function rundaisybundledaisyprocessor(ctx: TaskContext): Promise<number> {
  try {
    const fs = (await import('node:fs')).default
    const path = (await import('node:path')).default
    const { formatdaisyworkletsablayout } = await import('zss/feature/synth/backend/daisy/daisycontrol')
    /**
     * Bundle Emscripten glue + DaisyProcessor into a classic AudioWorklet script.
     * Injects SAB layout from daisycontrol.ts so worklet offsets stay aligned with C++.
     */



    const root = ctx.root
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
        throw new Error(
          'daisy-processor.worklet.js missing daisy-sab-layout markers',
        )
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
     * GENERATED — do not edit. Run \`yarn daisy:bundle:processor\`.
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
      `/** Bumped by \`yarn daisy:build\` — busts browser cache when wasm changes on same commit. */
    export const DAISY_BUILD_ID = '${buildid}'
    `,
    )
    console.log(`✓ ${buildidpath} (${buildid})`)
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- calibrate-play-drum-balance.ts ---
async function rundaisycalibrateplaydrumbalance(ctx: TaskContext): Promise<number> {
  try {
    const { execSync } = await import('node:child_process')
    const fs = (await import('node:fs')).default
    const path = (await import('node:path')).default
    const { fileURLToPath } = await import('node:url')
    const { RENDERS_FIXTURES_DIR } = await import('ops/lib/fixturepaths')
    const { PLAY_DRUM_BALANCE_METRICS,
  PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB,
  evalplaydrumbalancegate, } = await import('zss/feature/synth/backend/daisy/playdrumbalance.ts')
    const { PLAY_DRUM_BALANCE_SCENARIO_ID } = await import('zss/feature/synth/backend/daisy/playdrumbalancescenario.ts')
    /**
     * Grid-search kDrumBusGain / kPlayBusGain for play-drum balance gate.
     *
     * Usage:
     *   yarn play-drum-balance:calibrate
     *   yarn play-drum-balance:calibrate --dry-run
     */







    const ROOT = ctx.root
    const PROJECT = ctx.root
    const CONFIG_PATH = path.join(
      PROJECT,
      'zss/feature/synth/backend/daisy/native/zss/zss_config.h',
    )
    const BALANCE_JSON = path.join(
      RENDERS_FIXTURES_DIR,
      `${PLAY_DRUM_BALANCE_SCENARIO_ID}.json`,
    )

    const dryrun = ctx.args.includes('--dry-run')

    type GAINS = {
      playbus: number
      drumbus: number
    }

    function readgains(): GAINS {
      const text = fs.readFileSync(CONFIG_PATH, 'utf8')
      const playmatch = /kPlayBusGain\s*=\s*([\d.]+)f/.exec(text)
      const drummatch = /kDrumBusGain\s*=\s*([\d.]+)f/.exec(text)
      return {
        playbus: playmatch ? parseFloat(playmatch[1]) : 0.5,
        drumbus: drummatch ? parseFloat(drummatch[1]) : 0.167,
      }
    }

    function writegains(gains: GAINS) {
      let text = fs.readFileSync(CONFIG_PATH, 'utf8')
      text = text.replace(
        /constexpr float kPlayBusGain\s*=\s*[\d.]+f;/,
        `constexpr float kPlayBusGain = ${gains.playbus.toFixed(3)}f;`,
      )
      text = text.replace(
        /constexpr float kDrumBusGain\s*=\s*[\d.]+f;/,
        `constexpr float kDrumBusGain = ${gains.drumbus.toFixed(3)}f;`,
      )
      fs.writeFileSync(CONFIG_PATH, text)
    }

    function builddaisy() {
      execSync('yarn task run daisy:build', { cwd: PROJECT, stdio: 'inherit' })
    }

    function renderandmeasure(): PLAY_DRUM_BALANCE_METRICS {
      execSync('yarn task run daisy:play-drum-balance:render', {
        cwd: PROJECT,
        stdio: 'inherit',
      })
      const data = JSON.parse(fs.readFileSync(BALANCE_JSON, 'utf8')) as {
        balance: PLAY_DRUM_BALANCE_METRICS
      }
      return data.balance
    }

    function score(delta: number): number {
      return Math.abs(delta - PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB)
    }

    async function main() {
      const original = readgains()
      console.log('Original gains:', original)

      let best = { gains: original, delta: -999, err: 999 }
      const candidates: GAINS[] = []

      for (let drumbus = 0.12; drumbus <= 2.5 + 1e-6; drumbus += 0.08) {
        candidates.push({ playbus: original.playbus, drumbus })
      }

      for (const gains of candidates) {
        console.log(
          `\n▶ kPlayBusGain=${gains.playbus.toFixed(3)} kDrumBusGain=${gains.drumbus.toFixed(3)}`,
        )
        if (!dryrun) {
          writegains(gains)
          builddaisy()
        }

        const balance = dryrun
          ? { playpeakdb: 0, drumpeakdb: 0, drumminusplaydb: -999 }
          : renderandmeasure()
        const delta = balance.drumminusplaydb
        const err = score(delta)
        const gate = evalplaydrumbalancegate(balance)
        console.log(
          `  drum−play=${delta.toFixed(2)} dB err=${err.toFixed(2)} ${gate.pass ? 'PASS' : 'miss'}`,
        )

        if (err < best.err) {
          best = { gains, delta, err }
        }
        if (gate.pass) {
          best = { gains, delta, err }
          break
        }
      }

      if (best.err > 0.5) {
        console.log('\nCo-search kPlayBusGain with best drum bus…')
        const drumbus = best.gains.drumbus
        for (let playbus = 0.25; playbus <= 0.55 + 1e-6; playbus += 0.05) {
          const gains = { playbus, drumbus }
          console.log(
            `\n▶ kPlayBusGain=${gains.playbus.toFixed(3)} kDrumBusGain=${gains.drumbus.toFixed(3)}`,
          )
          if (!dryrun) {
            writegains(gains)
            builddaisy()
          }
          const balance = dryrun
            ? { playpeakdb: 0, drumpeakdb: 0, drumminusplaydb: -999 }
            : renderandmeasure()
          const delta = balance.drumminusplaydb
          const err = score(delta)
          const gate = evalplaydrumbalancegate(balance)
          console.log(
            `  drum−play=${delta.toFixed(2)} dB err=${err.toFixed(2)} ${gate.pass ? 'PASS' : 'miss'}`,
          )
          if (err < best.err) {
            best = { gains, delta, err }
          }
          if (gate.pass) {
            best = { gains, delta, err }
            break
          }
        }
      }

      console.log('\nBest:', best.gains, `drum−play=${best.delta.toFixed(2)} dB`)

      if (!dryrun) {
        writegains(best.gains)
        builddaisy()
        console.log('Wrote best gains to zss_config.h and rebuilt.')
        execSync('yarn task run daisy:play-drum-balance:test', {
          cwd: PROJECT,
          stdio: 'inherit',
        })
      } else {
        writegains(original)
        console.log('Dry run — restored original gains in file.')
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- calibrate-sidechain-parity.ts ---
async function rundaisycalibratesidechainparity(ctx: TaskContext): Promise<number> {
  try {
    const { execSync } = await import('node:child_process')
    const fs = (await import('node:fs')).default
    const path = (await import('node:path')).default
    const { fileURLToPath } = await import('node:url')
    const { SIDECHAIN_PARITY_RESULT,
  evalsidechainparitygate, } = await import('ops/lib/daisy-parity/sidechainparity')
    const { RENDERS_FIXTURES_DIR } = await import('ops/lib/fixturepaths')
    const { SIDECHAIN_SCENARIO_ID } = await import('zss/feature/synth/backend/daisy/sidechainscenario.ts')
    /**
     * Grid-search kScMix / kScMakeupDb for sidechain duck depth + bypass gate.
     *
     * Usage:
     *   yarn sidechain-parity:calibrate
     *   yarn sidechain-parity:calibrate --dry-run
     */







    const ROOT = ctx.root
    const PROJECT = ctx.root
    const CONFIG_PATH = path.join(
      PROJECT,
      'zss/feature/synth/backend/daisy/native/zss/zss_config.h',
    )
    const PARITY_JSON = path.join(
      RENDERS_FIXTURES_DIR,
      `${SIDECHAIN_SCENARIO_ID}-sidechain-parity.json`,
    )

    const dryrun = ctx.args.includes('--dry-run')

    type SCPARAMS = {
      mix: number
      makeupdb: number
    }

    function readparams(): SCPARAMS {
      const text = fs.readFileSync(CONFIG_PATH, 'utf8')
      const mixmatch = /kScMix\s*=\s*([\d.]+)f/.exec(text)
      const makeupmatch = /kScMakeupDb\s*=\s*([\d.]+)f/.exec(text)
      return {
        mix: mixmatch ? parseFloat(mixmatch[1]) : 0.75,
        makeupdb: makeupmatch ? parseFloat(makeupmatch[1]) : 24,
      }
    }

    function writeparams(params: SCPARAMS) {
      let text = fs.readFileSync(CONFIG_PATH, 'utf8')
      text = text.replace(
        /constexpr float kScMix\s*=\s*[\d.]+f;/,
        `constexpr float kScMix = ${params.mix.toFixed(3)}f;`,
      )
      text = text.replace(
        /constexpr float kScMakeupDb\s*=\s*[\d.]+f;/,
        `constexpr float kScMakeupDb = ${params.makeupdb.toFixed(1)}f;`,
      )
      fs.writeFileSync(CONFIG_PATH, text)
    }

    function builddaisy() {
      execSync('yarn task run daisy:build', { cwd: PROJECT, stdio: 'inherit' })
    }

    function measure(): SIDECHAIN_PARITY_RESULT {
      execSync('yarn task run daisy:sidechain:parity:render', {
        cwd: PROJECT,
        stdio: 'inherit',
      })
      const data = JSON.parse(fs.readFileSync(PARITY_JSON, 'utf8')) as {
        result: SIDECHAIN_PARITY_RESULT
      }
      return data.result
    }

    function score(result: SIDECHAIN_PARITY_RESULT): number {
      const gate = evalsidechainparitygate(result)
      if (gate.pass) {
        return 0
      }
      let err = 0
      if (result.duckon.duckdepthdb < 4) {
        err += (4 - result.duckon.duckdepthdb) * 2
      }
      if (result.duckoff.duckdepthdb > 2) {
        err += (result.duckoff.duckdepthdb - 2) * 3
      }
      err += Math.abs(onduck - 6) * 0.25
      return err
    }

    async function main() {
      const original = readparams()
      console.log('Original sidechain params:', original)

      let best = {
        params: original,
        result: null as SIDECHAIN_PARITY_RESULT | null,
        err: 999,
      }

      for (let makeupdb = 18; makeupdb <= 30.1; makeupdb += 2) {
        for (let mix = 0.55; mix <= 1.001; mix += 0.05) {
          const params = { mix, makeupdb }
          console.log(
            `\n▶ kScMix=${mix.toFixed(2)} kScMakeupDb=${makeupdb.toFixed(0)}`,
          )
          if (!dryrun) {
            writeparams(params)
            builddaisy()
          }
          const result = dryrun
            ? {
                duckon: {
                  duckdepthdb: 0,
                  prepeakdb: 0,
                  postpeakdb: 0,
                  stabtime: 0.75,
                },
                duckoff: {
                  duckdepthdb: 0,
                  prepeakdb: 0,
                  postpeakdb: 0,
                  stabtime: 0.75,
                },
                abduckdepthdb: 0,
              }
            : measure()
          const err = score(result)
          const gate = evalsidechainparitygate(result)
          console.log(
            `  A/B=${result.abduckdepthdb.toFixed(1)} ON=${result.duckon.duckdepthdb.toFixed(1)} OFF leak=${result.duckoff.duckdepthdb.toFixed(1)} err=${err.toFixed(2)} ${gate.pass ? 'PASS' : ''}`,
          )
          if (err < best.err) {
            best = { params, result, err }
          }
          if (gate.pass) {
            best = { params, result, err }
            break
          }
        }
        if (best.err === 0) {
          break
        }
      }

      console.log('\nBest:', best.params, `err=${best.err.toFixed(2)}`)

      if (!dryrun && best.result) {
        writeparams(best.params)
        builddaisy()
        execSync('yarn task run daisy:sidechain:parity:test', {
          cwd: PROJECT,
          stdio: 'inherit',
        })
      } else {
        writeparams(original)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- calibrate-synth-env-parity.ts ---
async function rundaisycalibratesynthenvparity(ctx: TaskContext): Promise<number> {
  try {
    const { execSync } = await import('node:child_process')
    const fs = (await import('node:fs')).default
    const path = (await import('node:path')).default
    const { fileURLToPath } = await import('node:url')
    const { SYNTH_ENV_PARITY_RESULT,
  evalsynthenvparitygate, } = await import('ops/lib/daisy-parity/synthenvparitygate')
    const { SYNTH_ENV_PARITY_REQUIRED_IDS,
  SYNTH_ENV_PARITY_SCENARIOS, } = await import('ops/lib/daisy-parity/synthenvparityscenario')
    const { RENDERS_FIXTURES_DIR } = await import('ops/lib/fixturepaths')
    const { CALIBRATE_SCRIPT_TIMEOUT_MS,
  EXEC_BUILD_DAISY_TIMEOUT_MS,
  EXEC_CALIBRATE_STEP_TIMEOUT_MS,
  EXEC_GATE_TIMEOUT_MS,
  EXEC_RENDER_PARITY_TIMEOUT_MS,
  withscripttimeout, } = await import('tasks/lib/parity/parity-timeouts.ts')
    /**
     * Grid-search kEnvDecayTauScale / kEnvReleaseTauScale for synth env parity.
     *
     * Usage:
     *   yarn synth-env-parity:calibrate
     *   yarn synth-env-parity:calibrate --dry-run
     */








    const ROOT = ctx.root
    const PROJECT = ctx.root
    const CONFIG_PATH = path.join(
      PROJECT,
      'zss/feature/synth/backend/daisy/native/zss/zss_config.h',
    )
    const OUTDIR = path.join(RENDERS_FIXTURES_DIR, 'synth-env-parity')

    const dryrun = ctx.args.includes('--dry-run')

    type ENVPARAMS = {
      decayscale: number
      releasescale: number
    }

    function readparams(): ENVPARAMS {
      const text = fs.readFileSync(CONFIG_PATH, 'utf8')
      const decaymatch = /kEnvDecayTauScale\s*=\s*([\d.]+)f/.exec(text)
      const releasematch = /kEnvReleaseTauScale\s*=\s*([\d.]+)f/.exec(text)
      return {
        decayscale: decaymatch ? parseFloat(decaymatch[1]) : 1,
        releasescale: releasematch ? parseFloat(releasematch[1]) : 1,
      }
    }

    function writeparams(params: ENVPARAMS) {
      let text = fs.readFileSync(CONFIG_PATH, 'utf8')
      text = text.replace(
        /constexpr float kEnvDecayTauScale\s*=\s*[\d.]+f;/,
        `constexpr float kEnvDecayTauScale = ${params.decayscale.toFixed(3)}f;`,
      )
      text = text.replace(
        /constexpr float kEnvReleaseTauScale\s*=\s*[\d.]+f;/,
        `constexpr float kEnvReleaseTauScale = ${params.releasescale.toFixed(3)}f;`,
      )
      fs.writeFileSync(CONFIG_PATH, text)
    }

    function builddaisy() {
      execSync('yarn task run daisy:build', {
        cwd: PROJECT,
        stdio: 'inherit',
        timeout: EXEC_BUILD_DAISY_TIMEOUT_MS,
      })
    }

    function measurerequired(): {
      pass: boolean
      err: number
      results: SYNTH_ENV_PARITY_RESULT[]
    } {
      execSync('yarn task run daisy:synth-env:render', {
        cwd: PROJECT,
        stdio: 'inherit',
        timeout: EXEC_RENDER_PARITY_TIMEOUT_MS,
      })
      const results: SYNTH_ENV_PARITY_RESULT[] = []
      let err = 0
      let allpass = true
      for (const scenario of SYNTH_ENV_PARITY_SCENARIOS) {
        if (!SYNTH_ENV_PARITY_REQUIRED_IDS.has(scenario.id)) {
          continue
        }
        const jsonpath = path.join(OUTDIR, `${scenario.id}.json`)
        const data = JSON.parse(fs.readFileSync(jsonpath, 'utf8')) as {
          result: SYNTH_ENV_PARITY_RESULT
        }
        const gate = evalsynthenvparitygate(data.result)
        results.push(data.result)
        if (!gate.pass) {
          allpass = false
          for (const reason of gate.reasons) {
            if (reason.includes('sustain')) {
              err += 3
            }
            if (reason.includes('release')) {
              err += 2
            }
            if (reason.includes('silent')) {
              err += 5
            }
          }
        }
      }
      return { pass: allpass, err, results }
    }

    async function main() {
      const original = readparams()
      console.log('Original env tau scales:', original)

      let best = { params: original, err: 999, pass: false }

      for (let releasescale = 0.04; releasescale <= 0.351; releasescale += 0.04) {
        for (let decayscale = 0.5; decayscale <= 1.101; decayscale += 0.1) {
          const params = { decayscale, releasescale }
          console.log(
            `\n▶ kEnvDecayTauScale=${decayscale.toFixed(2)} kEnvReleaseTauScale=${releasescale.toFixed(2)}`,
          )
          if (!dryrun) {
            writeparams(params)
            builddaisy()
          }
          const { pass, err } = dryrun
            ? { pass: false, err: 999 }
            : measurerequired()
          console.log(`  err=${err.toFixed(0)} ${pass ? 'PASS' : ''}`)
          if (err < best.err) {
            best = { params, err, pass }
          }
          if (pass) {
            best = { params, err: 0, pass: true }
            break
          }
        }
        if (best.pass) {
          break
        }
      }

      console.log('\nBest:', best.params, best.pass ? 'PASS' : `err=${best.err}`)

      if (!dryrun) {
        writeparams(best.params)
        builddaisy()
        execSync('yarn task run daisy:synth-env:test', {
          cwd: PROJECT,
          stdio: 'inherit',
          timeout: EXEC_GATE_TIMEOUT_MS,
        })
      } else {
        writeparams(original)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- regen-adsrenvcurve-tone-fixture.ts ---
async function rundaisyregenadsrenvcurvetonefixture(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const ROOT = ctx.root
    const PROJECT = ctx.root
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
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- regen-daisy-drum-parity-fixtures.ts ---
async function rundaisyregendaisydrumparityfixtures(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { DRUM_PARITY_PATCHES } = await import('ops/lib/daisy-parity/paritypatches')
    const ROOT = ctx.root
    const PROJECT = ctx.root
    const OUT = path.join(
      PROJECT,
      'ops/fixtures/synth/wasm/parity-metrics-daisy.json',
    )
    const REGEN_PORT = 9878

    function metricsusable(metrics: PARITY_AUDIO_METRICS): boolean {
      return metrics.rmsdb > -119
    }

    async function renderdrummetrics(
      page: import('@playwright/test').Page,
      patchid: string,
    ): Promise<PARITY_AUDIO_METRICS> {
      const parsed = await page.evaluate(
        async (args) => {
          const { runparityregen } =
            await import('/ops/lib/daisy-parity/parity-regen-runner.ts')
          return runparityregen(args)
        },
        { patchid, kind: 'drum' as const, backend: 'daisy' as const },
      )
      const metrics = parsed[patchid]
      if (!metrics) {
        throw new Error(`missing metrics for ${patchid}`)
      }
      return metrics
    }

    async function main() {
      let existing: Record<string, PARITY_AUDIO_METRICS> = {}
      try {
        const raw = readFileSync(OUT, 'utf8')
        existing =
          (JSON.parse(raw) as { patches: Record<string, PARITY_AUDIO_METRICS> })
            .patches ?? {}
      } catch {
        existing = {}
      }

      const { server, vite } = await startparityvite(PROJECT, REGEN_PORT)
      const browser = await launchparitybrowser()
      const patches: Record<string, PARITY_AUDIO_METRICS> = { ...existing }
      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(180_000)
        await page.goto(parityhosturl(REGEN_PORT), {
          waitUntil: 'domcontentloaded',
          timeout: 180000,
        })
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            console.error(`browser [${msg.text()}]`)
          }
        })
        page.on('pageerror', (err) => {
          console.error('pageerror:', err.message)
        })
        for (const patch of DRUM_PARITY_PATCHES) {
          const metrics = await renderdrummetrics(page, patch.id)
          if (!metricsusable(metrics)) {
            console.warn(`skip ${patch.id} — render silent`)
            continue
          }
          patches[patch.id] = metrics
          console.log(`daisy ${patch.id}`, metrics)
        }
      } finally {
        await browser.close()
        await new Promise<void>((resolve) => server.close(() => resolve()))
        await vite.close()
      }

      if (Object.keys(patches).length === 0) {
        console.error('No drum patches rendered.')
        return 1
      }
      writeFileSync(OUT, `${JSON.stringify({ patches }, null, 2)}\n`)
      console.log(`wrote ${OUT}`)
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- regen-env-adsr-parity-fixtures.ts ---
async function rundaisyregenenvadsrparityfixtures(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { ENVELOPE_ADSR_PARITY_PATCHES } = await import('ops/lib/daisy-parity/paritypatches')
    /**
     * Regen Tone metrics for env-adsr-sustain / env-adsr-retrigger only.
     */







    const ROOT = ctx.root
    const PROJECT = ctx.root
    const OUT = path.join(
      PROJECT,
      'ops/fixtures/synth/wasm/parity-metrics-tone.json',
    )
    const PORT = 9878

    async function renderpatchmetrics(
      page: import('@playwright/test').Page,
      patchid: string,
    ): Promise<PARITY_AUDIO_METRICS> {
      const parsed = await page.evaluate(
        async (args) => {
          const { runparityregen } =
            await import('/ops/lib/daisy-parity/parity-regen-runner.ts')
          return runparityregen(args)
        },
        { patchid, kind: 'voice' as const, backend: 'tone' as const },
      )
      const metrics = parsed[patchid]
      if (!metrics) {
        throw new Error(`missing metrics for ${patchid}`)
      }
      return metrics
    }

    async function main() {
      const raw = readFileSync(OUT, 'utf8')
      const file = JSON.parse(raw) as {
        patches: Record<string, PARITY_AUDIO_METRICS>
      }
      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser()
      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(180_000)
        await page.goto(parityhosturl(PORT), {
          waitUntil: 'domcontentloaded',
          timeout: 180000,
        })
        page.on('pageerror', (err) => console.error('pageerror:', err.message))
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            console.error('browser:', msg.text())
          }
        })
        for (const patch of ENVELOPE_ADSR_PARITY_PATCHES) {
          console.log(`tone ${patch.id}…`)
          file.patches[patch.id] = await renderpatchmetrics(page, patch.id)
        }
        writeFileSync(OUT, `${JSON.stringify(file, null, 2)}\n`)
        console.log(`updated ${OUT}`)
      } finally {
        await browser.close()
        await stopparityvite(parity)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- regen-sos-voice-fixtures.ts ---
async function rundaisyregensosvoicefixtures(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { SOS_VOICE_PATCHES } = await import('zss/feature/synth/backend/daisy/sosvoicepatches.ts')
    const ROOT = ctx.root
    const PROJECT = ctx.root
    const OUT = path.join(
      PROJECT,
      'ops/fixtures/synth/daisy/sos-voice-fixtures.json',
    )
    const REGEN_PORT = 9882

    async function rendersospatch(
      page: import('@playwright/test').Page,
      patchid: string | null,
    ): Promise<Record<string, PARITY_AUDIO_METRICS>> {
      return page.evaluate(
        async (args) => {
          const { runsosvoiceregen } =
            await import('/ops/lib/daisy-parity/sos-voice-regen-runner.ts')
          return runsosvoiceregen(args)
        },
        { patchid: patchid ?? undefined },
      )
    }

    async function main() {
      const handle = await startparityvite(PROJECT, REGEN_PORT)
      const browser = await launchparitybrowser()
      const page = await browser.newPage()
      page.setDefaultTimeout(300_000)
      await page.goto(parityhosturl(REGEN_PORT), {
        waitUntil: 'domcontentloaded',
        timeout: 300000,
      })
      const patches: Record<string, PARITY_AUDIO_METRICS> = {}

      try {
        for (const patch of SOS_VOICE_PATCHES) {
          const chunk = await rendersospatch(page, patch.id)
          patches[patch.id] = chunk[patch.id]
          if (!patches[patch.id]) {
            throw new Error(`missing metrics for ${patch.id}`)
          }
        }
        const payload = {
          generated: new Date().toISOString(),
          patches,
        }
        writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
        console.log(`wrote ${OUT} (${SOS_VOICE_PATCHES.length} patches)`)
      } finally {
        await browser.close()
        await stopparityvite(handle)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- regen-synth-parity-fixtures.ts ---
async function rundaisyregensynthparityfixtures(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { DRUM_PARITY_PATCHES,
  ENVELOPE_ADSR_PARITY_PATCHES,
  FX_PARITY_PATCHES,
  MAIN_DYNAMICS_PARITY_PATCHES,
  WASM_PARITY_PATCHES, } = await import('ops/lib/daisy-parity/paritypatches')
    const ROOT = ctx.root
    const PROJECT = ctx.root
    const USE_TONE = ctx.args.includes('--tone')
    const OUT = path.join(
      PROJECT,
      'ops/fixtures/synth/wasm',
      USE_TONE ? 'parity-metrics-tone.json' : 'parity-metrics.json',
    )
    const REGEN_PORT = USE_TONE ? 9877 : 9876

    function metricsusable(metrics: PARITY_AUDIO_METRICS): boolean {
      return metrics.rmsdb > -119
    }

    function loadexisting(): Record<string, PARITY_AUDIO_METRICS> {
      try {
        const raw = readFileSync(OUT, 'utf8')
        const parsed = JSON.parse(raw) as {
          patches: Record<string, PARITY_AUDIO_METRICS>
        }
        return parsed.patches ?? {}
      } catch {
        return {}
      }
    }

    async function renderpatchmetrics(
      page: import('@playwright/test').Page,
      patchid: string,
      kind: 'voice' | 'drum' | 'fx' | 'main',
    ): Promise<PARITY_AUDIO_METRICS> {
      const backend = USE_TONE ? 'tone' : 'wasm'
      const parsed = await page.evaluate(
        async (args) => {
          const { runparityregen } =
            await import('/ops/lib/daisy-parity/parity-regen-runner.ts')
          return runparityregen(args)
        },
        { patchid, kind, backend },
      )
      const metrics = parsed[patchid]
      if (!metrics) {
        throw new Error(`missing metrics for ${patchid}`)
      }
      return metrics
    }

    async function renderallpatches(): Promise<
      Record<string, PARITY_AUDIO_METRICS>
    > {
      const { server, vite } = await startparityvite(PROJECT, REGEN_PORT)
      const browser = await launchparitybrowser()
      const out: Record<string, PARITY_AUDIO_METRICS> = {}
      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(180_000)
        await page.goto(parityhosturl(REGEN_PORT), {
          waitUntil: 'domcontentloaded',
          timeout: 180000,
        })
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            console.error(`browser [${msg.text()}]`)
          }
        })
        page.on('pageerror', (err) => {
          console.error('pageerror:', err.message)
        })
        for (const patch of WASM_PARITY_PATCHES) {
          out[patch.id] = await renderpatchmetrics(page, patch.id, 'voice')
        }
        for (const patch of ENVELOPE_ADSR_PARITY_PATCHES) {
          out[patch.id] = await renderpatchmetrics(page, patch.id, 'voice')
        }
        for (const patch of DRUM_PARITY_PATCHES) {
          out[patch.id] = await renderpatchmetrics(page, patch.id, 'drum')
        }
        for (const patch of FX_PARITY_PATCHES) {
          out[patch.id] = await renderpatchmetrics(page, patch.id, 'fx')
        }
        for (const patch of MAIN_DYNAMICS_PARITY_PATCHES) {
          out[patch.id] = await renderpatchmetrics(page, patch.id, 'main')
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
      const rendered = await renderallpatches()
      const allids = [
        ...WASM_PARITY_PATCHES.map((p) => p.id),
        ...ENVELOPE_ADSR_PARITY_PATCHES.map((p) => p.id),
        ...DRUM_PARITY_PATCHES.map((p) => p.id),
        ...FX_PARITY_PATCHES.map((p) => p.id),
        ...MAIN_DYNAMICS_PARITY_PATCHES.map((p) => p.id),
      ]
      for (const patchid of allids) {
        const metrics = rendered[patchid]
        if (!metrics) {
          console.warn(`skip ${patchid} — render missing`)
          continue
        }
        if (!metricsusable(metrics)) {
          if (existing[patchid]) {
            console.warn(`keep ${patchid} — render silent`)
            continue
          }
          console.warn(`skip ${patchid} — render silent and no existing fixture`)
          continue
        }
        patches[patchid] = metrics
        console.log(`${USE_TONE ? 'tone' : 'wasm'} ${patchid}`, metrics)
      }
      if (Object.keys(patches).length === 0) {
        console.error(
          'No patches rendered — ensure playwright chromium is installed.',
        )
        return 1
      }
      writeFileSync(OUT, `${JSON.stringify({ patches }, null, 2)}\n`)
      console.log(`wrote ${OUT}`)
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-daisy-regression.ts ---
async function rundaisyrundaisyregression(ctx: TaskContext): Promise<number> {
  try {
    const { execSync } = await import('node:child_process')
    const path = (await import('node:path')).default
    const { fileURLToPath } = await import('node:url')
    const { EXEC_GATE_TIMEOUT_MS,
  EXEC_RENDER_PARITY_TIMEOUT_MS,
  PARITY_RENDER_SCRIPT_TIMEOUT_MS,
  withscripttimeout, } = await import('tasks/lib/parity/parity-timeouts.ts')
    /**
     * Local Daisy regression: Jest unit gates + one build + critical Playwright :full suites.
     * Not run in CI (see on-pr-check.yml). Use before merging native DSP changes.
     *
     * Usage:
     *   yarn task run daisy:regression:test
     *   yarn task run daisy:regression:test --skip-playwright
     */




    const ROOT = ctx.root
    const PROJECT = ctx.root

    const SKIP_PLAYWRIGHT = ctx.args.includes('--skip-playwright')

    const JEST_PATHS = [
      'ops/tests/unit/feature/synth/backend/daisy',
      'ops/tests/unit/feature/synth/backend/wasm/adsrenvcurve.test.ts',
    ]

    const SOS_VOICE_GATE = 'yarn task run daisy:sos-voices:test'

    const PLAYWRIGHT_FULL: { name: string; cmd: string }[] = [
      {
        name: 'pitch-stability',
        cmd: 'yarn task run daisy:pitch-stability:test:full',
      },
      {
        name: 'play-drum-balance',
        cmd: 'yarn task run daisy:play-drum-balance:test:full',
      },
      {
        name: 'sidechain-parity',
        cmd: 'yarn task run daisy:sidechain:parity:test:full',
      },
      { name: 'synth-env-parity', cmd: 'yarn task run daisy:synth-env:test:full' },
      { name: 'notepop', cmd: 'yarn task run daisy:notepop:test:full' },
    ]

    type STEPREPORT = { name: string; pass: boolean; detail?: string }

    function runstep(name: string, cmd: string, timeoutms: number): STEPREPORT {
      console.log(`\n▶ ${name}\n   ${cmd}\n`)
      try {
        execSync(cmd, { cwd: PROJECT, stdio: 'inherit', timeout: timeoutms })
        return { name, pass: true }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err)
        return { name, pass: false, detail }
      }
    }

    async function main() {
      const reports: STEPREPORT[] = []

      reports.push(
        runstep(
          'jest-daisy',
          `yarn jest --config ops/jest.config.ts ${JEST_PATHS.join(' ')} --verbose`,
          EXEC_GATE_TIMEOUT_MS * 2,
        ),
      )
      if (!reports[reports.length - 1].pass) {
        printsummary(reports)
        return 1
      }

      reports.push(
        runstep('sos-voices', SOS_VOICE_GATE, EXEC_RENDER_PARITY_TIMEOUT_MS),
      )
      if (!reports[reports.length - 1].pass) {
        printsummary(reports)
        return 1
      }

      if (SKIP_PLAYWRIGHT) {
        console.log('\n(skip Playwright — --skip-playwright)')
        printsummary(reports)
        return
      }

      for (const suite of PLAYWRIGHT_FULL) {
        reports.push(
          runstep(
            suite.name,
            suite.cmd,
            EXEC_RENDER_PARITY_TIMEOUT_MS + EXEC_GATE_TIMEOUT_MS,
          ),
        )
        if (!reports[reports.length - 1].pass) {
          printsummary(reports)
          return 1
        }
      }

      reports.push(
        runstep(
          'adsr-parity',
          'yarn task run daisy:adsr-parity:test',
          PARITY_RENDER_SCRIPT_TIMEOUT_MS,
        ),
      )

      printsummary(reports)
      if (!reports.every((r) => r.pass)) {
        return 1
      }
    }

    function printsummary(reports: STEPREPORT[]) {
      console.log('\n── Daisy regression summary ──')
      for (const r of reports) {
        console.log(
          `  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`,
        )
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-env-parity.ts ---
async function rundaisyrunenvparity(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { ENV_PARITY_SCENARIOS } = await import('ops/lib/daisy-parity/envparityscenario')
    /**
     * Tone vs Daisy env parity offline renders.
     *
     * Usage: yarn env-parity:test
     *
     * Outputs: ops/fixtures/renders/env-parity/
     */









    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9886
    const OUTDIR = path.join(RENDERS_FIXTURES_DIR, 'env-parity')

    const PEAK_TOLERANCE_DB = 6
    const RMS_TOLERANCE_DB = 6
    const RETRIGGER_SCENARIO_ID = 'env-parity-amsaw-8n'
    const GATED_SCENARIO_IDS = new Set(
      ENV_PARITY_SCENARIOS.map((scenario) => scenario.id),
    )

    function assertparity(payload: {
      id: string
      daisy: { overallpeakdb: number; overallrmsdb: number }
      tone: { overallpeakdb: number; overallrmsdb: number }
      spread: { delta: number }
      timelinesmatch?: boolean
    }): string | undefined {
      if (!GATED_SCENARIO_IDS.has(payload.id)) {
        return undefined
      }
      const peakdelta = Math.abs(
        payload.daisy.overallpeakdb - payload.tone.overallpeakdb,
      )
      const rmsdelta = Math.abs(
        payload.daisy.overallrmsdb - payload.tone.overallrmsdb,
      )
      if (peakdelta > PEAK_TOLERANCE_DB) {
        return `peak delta ${peakdelta.toFixed(1)} dB exceeds ${PEAK_TOLERANCE_DB} dB`
      }
      if (payload.id !== 'env-parity-amsaw' && rmsdelta > RMS_TOLERANCE_DB) {
        return `RMS delta ${rmsdelta.toFixed(1)} dB exceeds ${RMS_TOLERANCE_DB} dB`
      }
      if (
        payload.id === RETRIGGER_SCENARIO_ID &&
        payload.timelinesmatch === false
      ) {
        return `peak timeline ASCII mismatch (want Tone shape e.g. ===##==##==##=---)`
      }
      return undefined
    }

    async function runenvparity() {
      fs.mkdirSync(OUTDIR, { recursive: true })

      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser(60_000)
      const results: ENV_PARITY_RESULT[] = []
      let failed = false

      try {
        for (const scenario of ENV_PARITY_SCENARIOS) {
          console.log(`Rendering env parity: ${scenario.id}…`)
          const page = await browser.newPage()
          page.setDefaultTimeout(PLAYWRIGHT_SCENARIO_TIMEOUT_MS)
          await page.goto(parityhosturl(PORT), {
            waitUntil: 'domcontentloaded',
            timeout: PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
          })
          const payload = await page.evaluate(
            async ({ scenarioid, windowms }) => {
              const { runenvparityscenario, envparitytimelinesmatchsamples } =
                await import('/ops/lib/daisy-parity/envparityrender.ts')
              const { arraybuffertobase64 } =
                await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
              const { envparityscenario, envparityretriggerscenario } =
                await import('/ops/lib/daisy-parity/envparityscenario.ts')

              const scenario =
                scenarioid === 'env-parity-amsaw-8n'
                  ? envparityretriggerscenario()
                  : envparityscenario()

              const result = await runenvparityscenario(scenario, windowms)
              const timelinesmatch =
                scenarioid === 'env-parity-amsaw-8n'
                  ? envparitytimelinesmatchsamples(
                      result.daisysamples,
                      result.daisysamplerate,
                      result.tonemono,
                      result.tonesamplerate,
                      result.rendersec,
                      windowms,
                    )
                  : true
              return {
                id: result.id,
                daisy: result.daisy,
                tone: result.tone,
                spread: result.spread,
                report: result.report,
                rendersec: result.rendersec,
                timelinesmatch,
                daisywavbase64: arraybuffertobase64(result.daisywav),
                tonewavbase64: arraybuffertobase64(result.tonewav),
              }
            },
            { scenarioid: scenario.id, windowms: 46 },
          )

          fs.writeFileSync(
            path.join(OUTDIR, `${scenario.id}-daisy.wav`),
            Buffer.from(payload.daisywavbase64, 'base64'),
          )
          fs.writeFileSync(
            path.join(OUTDIR, `${scenario.id}-tone.wav`),
            Buffer.from(payload.tonewavbase64, 'base64'),
          )
          fs.writeFileSync(path.join(OUTDIR, `${scenario.id}.txt`), payload.report)

          results.push({
            id: payload.id,
            daisy: payload.daisy,
            tone: payload.tone,
            spread: payload.spread,
            report: payload.report,
          })

          console.log(payload.report)
          console.log('')

          const failreason = assertparity(payload)
          if (failreason) {
            console.error(`FAIL ${scenario.id}: ${failreason}`)
            failed = true
          }
          await page.close()
        }

        fs.writeFileSync(
          path.join(OUTDIR, 'report.json'),
          JSON.stringify(
            {
              results,
              gates: {
                scenarios: [...GATED_SCENARIO_IDS],
                peaktolerancedb: PEAK_TOLERANCE_DB,
                rmstolerancedb: RMS_TOLERANCE_DB,
                retriggertimeline: `exact ASCII match required for ${RETRIGGER_SCENARIO_ID}`,
                spread: 'reported in report only',
              },
            },
            null,
            2,
          ),
        )
      } finally {
        await browser.close()
        await stopparityvite(parity)
      }

      if (failed) {
        return 1
      }
    }
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-fx-bus-metrics.ts ---
async function rundaisyrunfxbusmetrics(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { computefxbusmetrics,
  formatfxbusmetricsline,
  isfxbussoloscenario, } = await import('zss/feature/synth/backend/daisy/fxbusmetrics')
    const { FX_MATRIX_COMPARE_BASELINE } = await import('zss/feature/synth/backend/daisy/fxlevelscenarios')
    const { filterlevelstabilityscenarios } = await import('zss/feature/synth/backend/daisy/levelstabilityscenarios')
    /**
     * FX bus wet-lift report via Playwright offline render (needs OfflineAudioContext).
     *
     *   yarn fx-bus-metrics:test
     */








    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9878

    async function renderscenario(
      page: import('@playwright/test').Page,
      scenarioid: string,
    ): Promise<LEVEL_STABILITY_METRICS> {
      const parsed = await page.evaluate(
        async (args) => {
          const { runlevelstabilitybrowser } =
            await import('/ops/lib/daisy-parity/level-stability-runner.ts')
          return runlevelstabilitybrowser(args)
        },
        { scenarioid },
      )
      const metrics = parsed.metrics[scenarioid]
      if (!metrics) {
        throw new Error(`missing metrics for ${scenarioid}`)
      }
      return metrics
    }

    async function main() {
      const scenarios = filterlevelstabilityscenarios('fxmatrix')
      const { server, vite } = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser()
      const metrics: Record<string, LEVEL_STABILITY_METRICS> = {}
      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(600_000)
        await page.goto(parityhosturl(PORT), {
          waitUntil: 'domcontentloaded',
          timeout: 600000,
        })
        for (const scenario of scenarios) {
          console.warn(`Rendering ${scenario.id}…`)
          metrics[scenario.id] = await renderscenario(page, scenario.id)
        }
      } finally {
        await browser.close()
        await new Promise<void>((resolve) => server.close(resolve))
        await vite.close()
      }

      const base = metrics[FX_MATRIX_COMPARE_BASELINE]
      if (!base) {
        throw new Error(`missing ${FX_MATRIX_COMPARE_BASELINE}`)
      }

      console.log('')
      console.log('FX bus metrics (orthogonal wet estimate vs fxmatrix-dry):')
      for (const id of Object.keys(metrics).sort()) {
        if (!isfxbussoloscenario(id)) {
          continue
        }
        const cand = metrics[id]
        if (cand) {
          console.log(formatfxbusmetricsline(computefxbusmetrics(id, cand, base)))
        }
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-level-issue-song-compare.ts ---
async function rundaisyrunlevelissuesongcompare(ctx: TaskContext): Promise<number> {
  try {
    const fs = (await import('node:fs')).default
    const path = (await import('node:path')).default
    const { fileURLToPath } = await import('node:url')
    const { RENDERS_FIXTURES_DIR } = await import('ops/lib/fixturepaths')
    const { comparesongmetrics } = await import('zss/feature/synth/backend/daisy/levelissuesongcompare.ts')
    /**
     * Evidence-based Daisy vs Tone compare for level-issue song renders.
     *
     * Usage:
     *   yarn level-issue-song-compare:test
     *
     * Requires:
     *   ops/fixtures/renders/level-issue-song.json
     *   ops/fixtures/renders/level-issue-song-tone.json
     */






    const ROOT = ctx.root
    const PROJECT = ctx.root
    const OUTDIR = RENDERS_FIXTURES_DIR

    type SONG_JSON = {
      meta: { scenarioid: string; rendersec: number }
      metrics: LEVEL_STABILITY_METRICS
    }

    function loadjson(filepath: string): SONG_JSON {
      return JSON.parse(fs.readFileSync(filepath, 'utf8')) as SONG_JSON
    }

    async function main() {
      const daisypath = path.join(OUTDIR, 'level-issue-song.json')
      const tonepath = path.join(OUTDIR, 'level-issue-song-tone.json')

      if (!fs.existsSync(daisypath) || !fs.existsSync(tonepath)) {
        console.error('Missing render JSON. Run:')
        console.error('  yarn level-issue-song:render')
        console.error('  yarn level-issue-song:render:tone')
        return 1
      }

      const daisy = loadjson(daisypath)
      const tone = loadjson(tonepath)
      const durationsec = Math.max(daisy.meta.rendersec, tone.meta.rendersec)

      const result = comparesongmetrics(
        daisy.meta.scenarioid,
        tone.meta.scenarioid,
        daisy.metrics,
        tone.metrics,
        durationsec,
      )

      const reportpath = path.join(OUTDIR, 'level-issue-song-compare.txt')
      const jsonpath = path.join(OUTDIR, 'level-issue-song-compare.json')

      fs.writeFileSync(reportpath, result.report)
      fs.writeFileSync(jsonpath, JSON.stringify(result, null, 2))

      console.log(result.report)
      console.log('')
      console.log(`Report: ${reportpath}`)
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-level-stability.ts ---
async function rundaisyrunlevelstability(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { computefxbusmetrics,
  formatfxbusmetricsline,
  isfxbussoloscenario, } = await import('zss/feature/synth/backend/daisy/fxbusmetrics')
    const { FX_MATRIX_COMPARE_BASELINE,
  FX_MATRIX_MIN_SOLO_DISTORT_PEAK_LIFT_DB,
  FX_MATRIX_MIN_SOLO_PEAK_VS_DRY_DB,
  FX_MATRIX_PEAK_DELTA_MAX_DB, } = await import('zss/feature/synth/backend/daisy/fxlevelscenarios')
    const { LEVEL_STABILITY_COMPARE_PAIRS,
  LEVEL_STABILITY_MIN_FX_PEAKRANGE_INCREASE_DB,
  LEVEL_STABILITY_MIN_REVERB_RMSRANGE_INCREASE_DB,
  LEVEL_STABILITY_MIX_BALANCE_PAIRS,
  LEVEL_STABILITY_SCENARIOS,
  filterlevelstabilityscenarios, } = await import('zss/feature/synth/backend/daisy/levelstabilityscenarios.ts')
    const { formatmixbalanceline } = await import('zss/feature/synth/backend/wasm/compressormetrics.ts')
    const { LEVEL_STABILITY_METRICS,
  comparelevelstability,
  diagnoselevelstability,
  formatlevelstabilityline,
  formatwindowcompareplot, } = await import('zss/feature/synth/backend/wasm/levelstabilitymetrics.ts')
    /**
     * Offline Daisy level-stability harness (Playwright + Vite, mirrors parity regen).
     *
     * Usage:
     *   yarn level-stability:test
     *   yarn level-stability:test --strict
     *   yarn level-stability:test --filter scalecrew
     *   yarn level-stability:test --scenario scalecrew-climax-full
     *   yarn level-stability:test --compare scalecrew-climax-melody scalecrew-climax-full
     */









    const ROOT = ctx.root
    const PROJECT = ctx.root
    const LEVEL_STABILITY_PORT = 9878

    type SCENARIO_PAYLOAD = {
      metrics: Record<string, LEVEL_STABILITY_METRICS>
    }

    function parseargs() {
      const strict = ctx.args.includes('--strict')
      const scenidx = process.argv.indexOf('--scenario')
      const filteridx = process.argv.indexOf('--filter')
      const compareidx = process.argv.indexOf('--compare')
      const scenarioid =
        scenidx >= 0 && process.argv[scenidx + 1]
          ? process.argv[scenidx + 1]
          : 'all'
      const filter =
        filteridx >= 0 && process.argv[filteridx + 1]
          ? process.argv[filteridx + 1]
          : scenarioid === 'all'
            ? 'all'
            : scenarioid
      const comparea =
        compareidx >= 0 && process.argv[compareidx + 1]
          ? process.argv[compareidx + 1]
          : undefined
      const compareb =
        compareidx >= 0 && process.argv[compareidx + 2]
          ? process.argv[compareidx + 2]
          : undefined
      return { strict, scenarioid, filter, comparea, compareb }
    }

    function formatreport(
      metrics: Record<string, LEVEL_STABILITY_METRICS>,
      scenarios = LEVEL_STABILITY_SCENARIOS,
    ): string {
      const lines: string[] = [
        'Daisy offline level stability (46 ms windows, steady = middle 50% of active)',
        'scenario                     spkΔ            srmsΔ           spkσ             pk             steady',
        '-'.repeat(96),
      ]
      for (const scenario of scenarios) {
        const m = metrics[scenario.id]
        if (m) {
          lines.push(formatlevelstabilityline(scenario.id, m))
        }
      }
      lines.push('', 'Comparisons (candidate vs baseline):')
      for (const line of diagnoselevelstability(
        metrics,
        LEVEL_STABILITY_COMPARE_PAIRS,
      )) {
        lines.push(`  ${line}`)
      }
      lines.push('', 'Mix balance (full vs melody-only overall rms):')
      for (const [melodyid, fullid] of LEVEL_STABILITY_MIX_BALANCE_PAIRS) {
        const melody = metrics[melodyid]
        const full = metrics[fullid]
        if (melody && full) {
          lines.push(
            `  ${formatmixbalanceline(fullid, melodyid, full.overallrmsdb, melody.overallrmsdb)}`,
          )
        }
      }
      return lines.join('\n')
    }

    async function renderscenario(
      page: import('@playwright/test').Page,
      scenarioid: string,
    ): Promise<SCENARIO_PAYLOAD> {
      const parsed = await page.evaluate(
        async (args) => {
          const { runlevelstabilitybrowser } =
            await import('/ops/lib/daisy-parity/level-stability-runner.ts')
          return runlevelstabilitybrowser(args)
        },
        { scenarioid },
      )
      const metrics = parsed.metrics[scenarioid]
      if (!metrics) {
        throw new Error(`missing metrics for ${scenarioid}`)
      }
      if (metrics.overallpeakdb < -40) {
        throw new Error(
          `${scenarioid} output too quiet (${metrics.overallpeakdb.toFixed(1)} dB peak); render may have failed`,
        )
      }
      return parsed
    }

    async function renderall(filter: string): Promise<SCENARIO_PAYLOAD> {
      const { server, vite } = await startparityvite(PROJECT, LEVEL_STABILITY_PORT)
      const browser = await launchparitybrowser()
      const metrics: Record<string, LEVEL_STABILITY_METRICS> = {}
      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(600_000)
        await page.goto(parityhosturl(LEVEL_STABILITY_PORT), {
          waitUntil: 'domcontentloaded',
          timeout: 600000,
        })
        const scenarios = filterlevelstabilityscenarios(filter)
        if (scenarios.length === 0) {
          throw new Error(`unknown filter/scenario ${filter}`)
        }
        for (const scenario of scenarios) {
          const payload = await renderscenario(page, scenario.id)
          metrics[scenario.id] = payload.metrics[scenario.id]
        }
        return { metrics }
      } finally {
        await browser.close()
        await new Promise<void>((resolve) => server.close(resolve))
        await vite.close()
      }
    }

    function assertevidence(
      metrics: Record<string, LEVEL_STABILITY_METRICS>,
    ): string[] {
      const failures: string[] = []
      for (const [baseid, candid] of LEVEL_STABILITY_COMPARE_PAIRS) {
        const base = metrics[baseid]
        const cand = metrics[candid]
        if (!base || !cand) {
          continue
        }
        const delta = comparelevelstability(base, cand)
        if (
          candid.includes('reverb') &&
          delta.steadyrmsrangeDeltaDb <
            LEVEL_STABILITY_MIN_REVERB_RMSRANGE_INCREASE_DB
        ) {
          failures.push(
            `${candid} vs ${baseid}: steady rms +${delta.steadyrmsrangeDeltaDb.toFixed(1)} dB (expected >= ${LEVEL_STABILITY_MIN_REVERB_RMSRANGE_INCREASE_DB} dB)`,
          )
        }
        if (
          (candid.includes('fxstack') || candid.includes('reverb')) &&
          delta.steadypeakrangeDeltaDb <
            LEVEL_STABILITY_MIN_FX_PEAKRANGE_INCREASE_DB
        ) {
          failures.push(
            `${candid} vs ${baseid}: steady peak +${delta.steadypeakrangeDeltaDb.toFixed(1)} dB (expected >= ${LEVEL_STABILITY_MIN_FX_PEAKRANGE_INCREASE_DB} dB)`,
          )
        }
      }
      return failures
    }

    function assertfxmatrix(
      metrics: Record<string, LEVEL_STABILITY_METRICS>,
    ): string[] {
      const failures: string[] = []
      const base = metrics[FX_MATRIX_COMPARE_BASELINE]
      if (!base) {
        failures.push(`missing baseline ${FX_MATRIX_COMPARE_BASELINE}`)
        return failures
      }
      for (const [id, cand] of Object.entries(metrics)) {
        if (!id.startsWith('fxmatrix-') || id === FX_MATRIX_COMPARE_BASELINE) {
          continue
        }
        const peakdelta = cand.overallpeakdb - base.overallpeakdb
        if (peakdelta > FX_MATRIX_PEAK_DELTA_MAX_DB) {
          failures.push(
            `${id}: peak ${cand.overallpeakdb.toFixed(1)} dBFS is ${peakdelta.toFixed(1)} dB above dry (max ${FX_MATRIX_PEAK_DELTA_MAX_DB} dB)`,
          )
        }
        if (cand.overallpeakdb > -0.5) {
          failures.push(
            `${id}: peak ${cand.overallpeakdb.toFixed(1)} dBFS exceeds -0.5 dBFS`,
          )
        }
      }
      return failures
    }

    function assertfxaudibility(
      metrics: Record<string, LEVEL_STABILITY_METRICS>,
    ): string[] {
      const failures: string[] = []
      const base = metrics[FX_MATRIX_COMPARE_BASELINE]
      if (!base) {
        return failures
      }
      for (const [id, cand] of Object.entries(metrics)) {
        if (!isfxbussoloscenario(id)) {
          continue
        }
        const peakdelta = cand.overallpeakdb - base.overallpeakdb
        if (id === 'fxmatrix-distort') {
          if (peakdelta < FX_MATRIX_MIN_SOLO_DISTORT_PEAK_LIFT_DB) {
            failures.push(
              `${id}: peak lift ${peakdelta.toFixed(1)} dB vs dry (min +${FX_MATRIX_MIN_SOLO_DISTORT_PEAK_LIFT_DB} dB)`,
            )
          }
        } else if (peakdelta < FX_MATRIX_MIN_SOLO_PEAK_VS_DRY_DB) {
          failures.push(
            `${id}: peak ${cand.overallpeakdb.toFixed(1)} dBFS is ${peakdelta.toFixed(1)} dB vs dry (min ${FX_MATRIX_MIN_SOLO_PEAK_VS_DRY_DB} dB)`,
          )
        }
      }
      return failures
    }

    function formatfxbusreport(
      metrics: Record<string, LEVEL_STABILITY_METRICS>,
    ): string {
      const base = metrics[FX_MATRIX_COMPARE_BASELINE]
      if (!base) {
        return ''
      }
      const lines: string[] = [
        '',
        'FX bus wet lift (orthogonal estimate vs fxmatrix-dry):',
      ]
      for (const id of Object.keys(metrics).sort()) {
        if (!isfxbussoloscenario(id)) {
          continue
        }
        const cand = metrics[id]
        if (cand) {
          lines.push(
            `  ${formatfxbusmetricsline(computefxbusmetrics(id, cand, base))}`,
          )
        }
      }
      return lines.join('\n')
    }

    async function main() {
      const { strict, scenarioid, filter, comparea, compareb } = parseargs()

      if (comparea && compareb) {
        console.log(`Comparing ${comparea} vs ${compareb}…`)
        const { server, vite } = await startparityvite(
          PROJECT,
          LEVEL_STABILITY_PORT,
        )
        const browser = await launchparitybrowser()
        try {
          const page = await browser.newPage()
          page.setDefaultTimeout(600_000)
          await page.goto(parityhosturl(LEVEL_STABILITY_PORT), {
            waitUntil: 'domcontentloaded',
            timeout: 600000,
          })
          const first = await renderscenario(page, comparea)
          const second = await renderscenario(page, compareb)
          const ma = first.metrics[comparea]
          const mb = second.metrics[compareb]
          if (!ma || !mb) {
            throw new Error('compare render missing metrics')
          }
          console.log('')
          console.log(formatwindowcompareplot(comparea, compareb, ma, mb))
          console.log('')
          const delta = comparelevelstability(ma, mb)
          console.log(
            `Summary: steady peak ${delta.steadypeakrangeDeltaDb >= 0 ? '+' : ''}${delta.steadypeakrangeDeltaDb.toFixed(1)} dB, steady rms ${delta.steadyrmsrangeDeltaDb >= 0 ? '+' : ''}${delta.steadyrmsrangeDeltaDb.toFixed(1)} dB, overall peak ${(mb.overallpeakdb - ma.overallpeakdb).toFixed(1)} dB`,
          )
        } finally {
          await browser.close()
          await new Promise<void>((resolve) => server.close(resolve))
          await vite.close()
        }
        return
      }

      const runfilter = scenarioid !== 'all' ? scenarioid : filter
      console.log(`Rendering Daisy level stability (${runfilter})…`)
      const payload = await renderall(runfilter)
      const scenarios = filterlevelstabilityscenarios(runfilter)
      console.log('')
      console.log(formatreport(payload.metrics, scenarios))
      console.log('')
      console.log('Interpretation:')
      console.log(
        '  steady spkΔ/srmsΔ — windowed output swing after attack/release trim.',
      )
      console.log(
        '  mix rms vs melody-only — positive dB means drums/FX bus adds energy beyond voices alone.',
      )

      if (runfilter === 'all' || runfilter === 'simple') {
        const failures = assertevidence(payload.metrics)
        if (failures.length > 0) {
          console.log('')
          console.log(
            strict
              ? 'ASSERTION FAILURES:'
              : 'Simple-scenario thresholds not met (informational):',
          )
          for (const line of failures) {
            console.log(`  - ${line}`)
          }
          if (strict) {
            return 1
          }
        } else if (strict) {
          console.log('')
          console.log('Strict evidence thresholds passed.')
        }
      }

      if (runfilter === 'fxmatrix' || runfilter === 'all') {
        console.log(formatfxbusreport(payload.metrics))
        const fxfailures = [
          ...assertfxmatrix(payload.metrics),
          ...assertfxaudibility(payload.metrics),
        ]
        if (fxfailures.length > 0) {
          console.log('')
          console.log('FX matrix gates failed:')
          for (const line of fxfailures) {
            console.log(`  - ${line}`)
          }
          return 1
        }
        if (runfilter === 'fxmatrix') {
          console.log('')
          console.log('FX matrix gates passed (peak caps + solo audibility).')
        }
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-notepop-gates.ts ---
async function rundaisyrunnotepopgates(ctx: TaskContext): Promise<number> {
  try {
    const fs = (await import('node:fs')).default
    const path = (await import('node:path')).default
    const { fileURLToPath } = await import('node:url')
    const { RENDERS_FIXTURES_DIR } = await import('ops/lib/fixturepaths')
    const { NOTEPOP_RENDER_METRICS,
  evalnotepopgates,
  formatnotepopgatereport, } = await import('zss/feature/synth/backend/daisy/notepopgates.ts')
    const { NOTEPOP_SCENARIO_ID,
  notepopmeta, } = await import('zss/feature/synth/backend/daisy/notepopscenario.ts')
    /**
     * Objective pass/fail gates for notepop comp-on vs comp-off renders.
     *
     * Usage:
     *   yarn notepop:test
     */






    const ROOT = ctx.root
    const PROJECT = ctx.root
    const OUTDIR = RENDERS_FIXTURES_DIR

    type NOTEPOP_JSON = NOTEPOP_RENDER_METRICS & {
      notepopmeta?: ReturnType<typeof notepopmeta>
    }

    function loadmetrics(suffix: string): NOTEPOP_JSON {
      const jsonpath = path.join(OUTDIR, `${NOTEPOP_SCENARIO_ID}${suffix}.json`)
      if (!fs.existsSync(jsonpath)) {
        throw new Error(`missing render JSON: ${jsonpath}`)
      }
      return JSON.parse(fs.readFileSync(jsonpath, 'utf8')) as NOTEPOP_JSON
    }

    function main() {
      const compon = loadmetrics('-comp-on')
      const compoff = loadmetrics('-comp-off')
      const meta = compon.notepopmeta ?? compoff.notepopmeta ?? notepopmeta()
      const report = evalnotepopgates(compon, compoff, meta)
      console.log(formatnotepopgatereport(report))
      if (!report.pass) {
        return 1
      }
    }

    main()
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-notepop-render.ts ---
async function rundaisyrunnotepoprender(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { notepopmeta,
  notepopscenario, } = await import('zss/feature/synth/backend/daisy/notepopscenario.ts')
    /**
     * Offline render of the note-pop repro → WAV + metrics report.
     *
     * Usage:
     *   yarn notepop:render
     *   yarn notepop:render --no-comp
     *   yarn notepop:render:ab
     *
     * Outputs:
     *   ops/fixtures/renders/notepop-qcxdxexfx.wav (default)
     *   ops/fixtures/renders/notepop-qcxdxexfx-comp-on.* / -comp-off.* (--ab)
     *
     * Browser preview (yarn app:dev):
     *   yarn notepop-song:render
     */








    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9881
    const OUTDIR = RENDERS_FIXTURES_DIR

    type RENDER_PASS = {
      suffix: string
      maincompbypass: boolean
    }

    function parsepasses(): RENDER_PASS[] {
      const ab = ctx.args.includes('--ab')
      const nocomp = ctx.args.includes('--no-comp')
      if (ab) {
        return [
          { suffix: '-comp-on', maincompbypass: false },
          { suffix: '-comp-off', maincompbypass: true },
        ]
      }
      if (nocomp) {
        return [{ suffix: '-comp-off', maincompbypass: true }]
      }
      return [{ suffix: '', maincompbypass: false }]
    }

    async function renderpass(
      page: import('@playwright/test').Page,
      maincompbypass: boolean,
    ): Promise<SONG_RENDER_PAYLOAD> {
      return page.evaluate(async (bypass) => {
        const { renderdaisysongpayload } =
          await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
        const { notepopscenario } =
          await import('/zss/feature/synth/backend/daisy/notepopscenario.ts')
        const scenario = {
          ...notepopscenario(),
          maincompbypass: bypass,
        }
        console.warn('[notepop] booting daisy wasm…')
        const payload = await renderdaisysongpayload(scenario)
        console.warn('[notepop] render complete, encoding wav…')
        return payload
      }, maincompbypass)
    }

    async function main() {
      fs.mkdirSync(OUTDIR, { recursive: true })

      const meta = notepopmeta()
      const passes = parsepasses()
      console.log('Note pop meta:', JSON.stringify(meta, null, 2))

      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser()

      try {
        for (const pass of passes) {
          const passpage = await browser.newPage()
          passpage.setDefaultTimeout(600_000)
          passpage.on('console', (msg) => {
            const text = msg.text()
            if (
              text.startsWith('[notepop]') ||
              text.startsWith('[daisy boot]') ||
              text.startsWith('[daisy render]')
            ) {
              console.log(text)
            }
          })

          await passpage.goto(parityhosturl(PORT), { waitUntil: 'domcontentloaded' })
          console.log(
            `Rendering notepop${pass.suffix || ''} (comp ${pass.maincompbypass ? 'OFF' : 'ON'})…`,
          )
          const payload = await renderpass(passpage, pass.maincompbypass)
          await passpage.close()
          const typed = payload
          const basename = `${typed.meta.scenarioid}${pass.suffix}`
          const wavpath = path.join(OUTDIR, `${basename}.wav`)
          const jsonpath = path.join(OUTDIR, `${basename}.json`)
          const txtpath = path.join(OUTDIR, `${basename}.txt`)

          fs.writeFileSync(wavpath, Buffer.from(typed.wavbase64, 'base64'))
          fs.writeFileSync(
            jsonpath,
            JSON.stringify(
              {
                meta: typed.meta,
                notepopmeta: meta,
                maincompbypass: pass.maincompbypass,
                metrics: typed.metrics,
                loudestwindows: typed.loudestwindows,
              },
              null,
              2,
            ),
          )
          fs.writeFileSync(txtpath, typed.report)

          console.log('')
          console.log(typed.report)
          console.log('')
          console.log(`WAV:  ${wavpath}`)
          console.log(`JSON: ${jsonpath}`)
          console.log(`TXT:  ${txtpath}`)
          console.log('')
          console.log(`Listen: afplay ${wavpath}`)
        }

      } finally {
        await browser.close()
        await stopparityvite(parity)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-pitch-stability-gates.ts ---
async function rundaisyrunpitchstabilitygates(ctx: TaskContext): Promise<number> {
  try {
    const fs = (await import('node:fs')).default
    const path = (await import('node:path')).default
    const { fileURLToPath } = await import('node:url')
    const { RENDERS_FIXTURES_DIR } = await import('ops/lib/fixturepaths')
    const { PITCH_STABILITY_METRICS,
  evalpitchstabilitygate,
  formatpitchstabilityreport, } = await import('zss/feature/synth/backend/daisy/pitchstability.ts')
    const { PITCH_STABILITY_SCENARIO_ID } = await import('zss/feature/synth/backend/daisy/pitchstabilityscenario.ts')
    /**
     * Pass/fail gate for pitch-stability offline render.
     *
     * Usage:
     *   yarn pitch-stability:test
     */






    const ROOT = ctx.root
    const PROJECT = ctx.root
    const JSONPATH = path.join(
      RENDERS_FIXTURES_DIR,
      `${PITCH_STABILITY_SCENARIO_ID}.json`,
    )

    type PITCH_JSON = {
      pitchmetrics: PITCH_STABILITY_METRICS
      gate?: { pass: boolean; reasons: string[] }
    }

    function main() {
      if (!fs.existsSync(JSONPATH)) {
        console.error(`missing render JSON: ${JSONPATH}`)
        console.error('run: yarn pitch-stability:render')
        return 1
      }

      const data = JSON.parse(fs.readFileSync(JSONPATH, 'utf8')) as PITCH_JSON
      const gate = evalpitchstabilitygate(data.pitchmetrics)
      console.log(formatpitchstabilityreport(PITCH_STABILITY_SCENARIO_ID, gate))
      if (!gate.pass) {
        return 1
      }
    }

    main()
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-pitch-stability.ts ---
async function rundaisyrunpitchstability(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { analyzepitchstability,
  evalpitchstabilitygate,
  formatpitchstabilityreport, } = await import('zss/feature/synth/backend/daisy/pitchstability.ts')
    const { PITCH_STABILITY_EXPECTED_PITCH,
  PITCH_STABILITY_SCENARIO_ID,
  pitchstabilityattacktimes,
  pitchstabilityscenario, } = await import('zss/feature/synth/backend/daisy/pitchstabilityscenario.ts')
    /**
     * Offline render for pitch-stability scenario → WAV + pitch metrics JSON.
     *
     * Usage:
     *   yarn pitch-stability:render
     *
     * Outputs:
     *   ops/fixtures/renders/pitch-stability-c4-8n.wav
     *   ops/fixtures/renders/pitch-stability-c4-8n.json
     */








    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9883
    const OUTDIR = RENDERS_FIXTURES_DIR

    type RENDER_PAYLOAD = {
      meta: {
        scenarioid: string
        rendersec: number
        samplerate: number
        samplecount: number
      }
      wavbase64: string
      report: string
    }

    async function renderpass(
      page: import('@playwright/test').Page,
    ): Promise<{ samples: Float32Array; samplerate: number; report: string }> {
      return page.evaluate(async () => {
        const { renderdaisysongpayload } =
          await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
        const { pitchstabilityscenario } =
          await import('/zss/feature/synth/backend/daisy/pitchstabilityscenario.ts')
        const {
          analyzepitchstability,
          evalpitchstabilitygate,
          formatpitchstabilityreport,
        } = await import('/zss/feature/synth/backend/daisy/pitchstability.ts')
        const { pitchstabilityattacktimes, PITCH_STABILITY_EXPECTED_PITCH } =
          await import('/zss/feature/synth/backend/daisy/pitchstabilityscenario.ts')

        console.warn('[pitch-stability] booting daisy wasm…')
        const scenario = pitchstabilityscenario()
        const payload = await renderdaisysongpayload(scenario)
        console.warn('[pitch-stability] render complete')

        const binary = atob(payload.wavbase64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        const view = new DataView(bytes.buffer)
        const samplerate = view.getUint32(24, true)
        const samplecount = view.getUint32(40, true) / 2
        const samples = new Float32Array(samplecount)
        let offset = 44
        for (let i = 0; i < samplecount; i++) {
          samples[i] = view.getInt16(offset, true) / 0x8000
          offset += 2
        }

        const attacks = pitchstabilityattacktimes()
        const pitchmetrics = analyzepitchstability(
          samples,
          samplerate,
          attacks,
          PITCH_STABILITY_EXPECTED_PITCH,
        )
        const gate = evalpitchstabilitygate(pitchmetrics)
        const pitchreport = formatpitchstabilityreport(scenario.id, gate)

        return {
          samples,
          samplerate,
          report: `${payload.report}\n\n${pitchreport}`,
          pitchmetrics,
          gate,
          meta: payload.meta,
        }
      })
    }

    async function main() {
      fs.mkdirSync(OUTDIR, { recursive: true })

      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser()

      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(600_000)
        page.on('console', (msg) => {
          const text = msg.text()
          if (
            text.startsWith('[pitch-stability]') ||
            text.startsWith('[daisy boot]') ||
            text.startsWith('[daisy render]')
          ) {
            console.log(text)
          }
        })

        await page.goto(parityhosturl(PORT), { waitUntil: 'domcontentloaded' })
        console.log(`Rendering ${PITCH_STABILITY_SCENARIO_ID}…`)

        const result = await renderpass(page)
        await page.close()

        const basename = PITCH_STABILITY_SCENARIO_ID
        const wavpath = path.join(OUTDIR, `${basename}.wav`)
        const jsonpath = path.join(OUTDIR, `${basename}.json`)
        const txtpath = path.join(OUTDIR, `${basename}.txt`)

        const evaluated = result as {
          samples: Float32Array
          samplerate: number
          report: string
          pitchmetrics: ReturnType<typeof analyzepitchstability>
          gate: ReturnType<typeof evalpitchstabilitygate>
          meta: RENDER_PAYLOAD['meta']
        }

        const attacks = pitchstabilityattacktimes()
        const pitchmetrics =
          evaluated.pitchmetrics ??
          analyzepitchstability(
            evaluated.samples,
            evaluated.samplerate,
            attacks,
            PITCH_STABILITY_EXPECTED_PITCH,
          )
        const gate = evaluated.gate ?? evalpitchstabilitygate(pitchmetrics)

        const buffer = Buffer.alloc(44 + evaluated.samples.length * 2)
        const view = new DataView(buffer.buffer)
        const sr = evaluated.samplerate
        const write = (o: number, s: string) => {
          for (let i = 0; i < s.length; i++) {
            buffer[o + i] = s.charCodeAt(i)
          }
        }
        write(0, 'RIFF')
        view.setUint32(4, 36 + evaluated.samples.length * 2, true)
        write(8, 'WAVE')
        write(12, 'fmt ')
        view.setUint32(16, 16, true)
        view.setUint16(20, 1, true)
        view.setUint16(22, 1, true)
        view.setUint32(24, sr, true)
        view.setUint32(28, sr * 2, true)
        view.setUint16(32, 2, true)
        view.setUint16(34, 16, true)
        write(36, 'data')
        view.setUint32(40, evaluated.samples.length * 2, true)
        let off = 44
        for (let i = 0; i < evaluated.samples.length; i++) {
          const c = Math.max(-1, Math.min(1, evaluated.samples[i]))
          view.setInt16(off, c < 0 ? c * 0x8000 : c * 0x7fff, true)
          off += 2
        }
        fs.writeFileSync(wavpath, buffer)

        fs.writeFileSync(
          jsonpath,
          JSON.stringify(
            {
              meta: evaluated.meta,
              pitchmetrics,
              gate: { pass: gate.pass, reasons: gate.reasons },
            },
            null,
            2,
          ),
        )
        fs.writeFileSync(txtpath, evaluated.report)

        console.log('')
        console.log(evaluated.report)
        console.log('')
        console.log(`WAV:  ${wavpath}`)
        console.log(`JSON: ${jsonpath}`)
        console.log(`TXT:  ${txtpath}`)
      } finally {
        await browser.close()
        await stopparityvite(parity)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-play-drum-balance-gates.ts ---
async function rundaisyrunplaydrumbalancegates(ctx: TaskContext): Promise<number> {
  try {
    const fs = (await import('node:fs')).default
    const path = (await import('node:path')).default
    const { fileURLToPath } = await import('node:url')
    const { RENDERS_FIXTURES_DIR } = await import('ops/lib/fixturepaths')
    const { PLAY_DRUM_BALANCE_METRICS,
  evalplaydrumbalancegate,
  formatplaydrumbalancereport, } = await import('zss/feature/synth/backend/daisy/playdrumbalance.ts')
    const { PLAY_DRUM_BALANCE_SCENARIO_ID } = await import('zss/feature/synth/backend/daisy/playdrumbalancescenario.ts')
    /**
     * Pass/fail gate for play vs drum balance render.
     *
     * Usage:
     *   yarn play-drum-balance:test
     */






    const ROOT = ctx.root
    const PROJECT = ctx.root
    const JSONPATH = path.join(
      RENDERS_FIXTURES_DIR,
      `${PLAY_DRUM_BALANCE_SCENARIO_ID}.json`,
    )

    type BALANCE_JSON = {
      balance: PLAY_DRUM_BALANCE_METRICS
    }

    function main() {
      if (!fs.existsSync(JSONPATH)) {
        console.error(`missing render JSON: ${JSONPATH}`)
        console.error('run: yarn play-drum-balance:render')
        return 1
      }

      const data = JSON.parse(fs.readFileSync(JSONPATH, 'utf8')) as BALANCE_JSON
      const gate = evalplaydrumbalancegate(data.balance)
      console.log(formatplaydrumbalancereport(gate))
      if (!gate.pass) {
        return 1
      }
    }

    main()
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-play-drum-balance-render.ts ---
async function rundaisyrunplaydrumbalancerender(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { analyzeplaydrumbalance,
  evalplaydrumbalancegate,
  formatplaydrumbalancereport, } = await import('zss/feature/synth/backend/daisy/playdrumbalance.ts')
    const { PLAY_DRUM_BALANCE_SCENARIO_ID,
  playdrumbalancedrumscenario,
  playdrumbalanceplayscenario, } = await import('zss/feature/synth/backend/daisy/playdrumbalancescenario.ts')
    /**
     * Offline play vs drum balance stems → WAV + JSON.
     *
     * Usage:
     *   yarn play-drum-balance:render
     */








    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9884
    const OUTDIR = RENDERS_FIXTURES_DIR

    function encodewavmono16(samples: Float32Array, samplerate: number): Buffer {
      const datasize = samples.length * 2
      const buffer = Buffer.alloc(44 + datasize)
      const view = new DataView(buffer.buffer)
      const write = (o: number, s: string) => {
        for (let i = 0; i < s.length; i++) {
          buffer[o + i] = s.charCodeAt(i)
        }
      }
      write(0, 'RIFF')
      view.setUint32(4, 36 + datasize, true)
      write(8, 'WAVE')
      write(12, 'fmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, samplerate, true)
      view.setUint32(28, samplerate * 2, true)
      view.setUint16(32, 2, true)
      view.setUint16(34, 16, true)
      write(36, 'data')
      view.setUint32(40, datasize, true)
      let off = 44
      for (let i = 0; i < samples.length; i++) {
        const c = Math.max(-1, Math.min(1, samples[i]))
        view.setInt16(off, c < 0 ? c * 0x8000 : c * 0x7fff, true)
        off += 2
      }
      return buffer
    }

    async function renderstem(
      page: import('@playwright/test').Page,
      stem: 'play' | 'drum',
    ): Promise<{ samples: Float32Array; samplerate: number; meta: object }> {
      return page.evaluate(async (which) => {
        const { renderdaisysongpayload } =
          await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
        const { playdrumbalanceplayscenario, playdrumbalancedrumscenario } =
          await import('/zss/feature/synth/backend/daisy/playdrumbalancescenario.ts')
        const scenario =
          which === 'play'
            ? playdrumbalanceplayscenario()
            : playdrumbalancedrumscenario()
        console.warn(`[play-drum-balance] render ${which}…`)
        const payload = await renderdaisysongpayload(scenario)
        const binary = atob(payload.wavbase64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        const view = new DataView(bytes.buffer)
        const samplerate = view.getUint32(24, true)
        const samplecount = view.getUint32(40, true) / 2
        const samples = new Float32Array(samplecount)
        let offset = 44
        for (let i = 0; i < samplecount; i++) {
          samples[i] = view.getInt16(offset, true) / 0x8000
          offset += 2
        }
        return { samples, samplerate, meta: payload.meta }
      }, stem)
    }

    async function main() {
      fs.mkdirSync(OUTDIR, { recursive: true })

      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser()

      try {
        const playpage = await browser.newPage()
        const drumpage = await browser.newPage()
        for (const p of [playpage, drumpage]) {
          p.setDefaultTimeout(600_000)
          p.on('console', (msg) => {
            const text = msg.text()
            if (
              text.startsWith('[play-drum-balance]') ||
              text.startsWith('[daisy boot]') ||
              text.startsWith('[daisy render]')
            ) {
              console.log(text)
            }
          })
        }

        await playpage.goto(parityhosturl(PORT), { waitUntil: 'domcontentloaded' })
        await drumpage.goto(parityhosturl(PORT), { waitUntil: 'domcontentloaded' })

        const playrender = await renderstem(playpage, 'play')
        const drumrender = await renderstem(drumpage, 'drum')
        await playpage.close()
        await drumpage.close()

        const balance = analyzeplaydrumbalance(
          playrender.samples,
          drumrender.samples,
          playrender.samplerate,
        )
        const gate = evalplaydrumbalancegate(balance)

        const summaryid = PLAY_DRUM_BALANCE_SCENARIO_ID
        const jsonpath = path.join(OUTDIR, `${summaryid}.json`)
        const txtpath = path.join(OUTDIR, `${summaryid}.txt`)

        for (const [stem, data] of [
          ['play', playrender] as const,
          ['drum', drumrender] as const,
        ]) {
          const basename = `${summaryid}-${stem}`
          fs.writeFileSync(
            path.join(OUTDIR, `${basename}.wav`),
            encodewavmono16(data.samples, data.samplerate),
          )
          fs.writeFileSync(
            path.join(OUTDIR, `${basename}.json`),
            JSON.stringify({ meta: data.meta, stem }, null, 2),
          )
        }

        fs.writeFileSync(
          jsonpath,
          JSON.stringify(
            {
              balance,
              gate: { pass: gate.pass, reasons: gate.reasons },
              playmeta: playrender.meta,
              drummeta: drumrender.meta,
            },
            null,
            2,
          ),
        )
        fs.writeFileSync(txtpath, formatplaydrumbalancereport(gate))

        console.log('')
        console.log(formatplaydrumbalancereport(gate))
        console.log('')
        console.log(`JSON: ${jsonpath}`)
        console.log(`TXT:  ${txtpath}`)
      } finally {
        await browser.close()
        await stopparityvite(parity)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-sidechain-parity-gates.ts ---
async function rundaisyrunsidechainparitygates(ctx: TaskContext): Promise<number> {
  try {
    const fs = (await import('node:fs')).default
    const path = (await import('node:path')).default
    const { fileURLToPath } = await import('node:url')
    const { SIDECHAIN_PARITY_RESULT,
  evalsidechainparitygate,
  formatsidechainparityreport, } = await import('ops/lib/daisy-parity/sidechainparity')
    const { RENDERS_FIXTURES_DIR } = await import('ops/lib/fixturepaths')
    const { SIDECHAIN_SCENARIO_ID } = await import('zss/feature/synth/backend/daisy/sidechainscenario.ts')
    /**
     * Pass/fail gate for sidechain parity render.
     *
     * Usage:
     *   yarn sidechain-parity:test
     */






    const ROOT = ctx.root
    const PROJECT = ctx.root
    const JSONPATH = path.join(
      RENDERS_FIXTURES_DIR,
      `${SIDECHAIN_SCENARIO_ID}-sidechain-parity.json`,
    )

    function main() {
      if (!fs.existsSync(JSONPATH)) {
        console.error(`missing ${JSONPATH}`)
        console.error('run: yarn sidechain-parity:render')
        return 1
      }
      const data = JSON.parse(fs.readFileSync(JSONPATH, 'utf8')) as {
        result: SIDECHAIN_PARITY_RESULT
      }
      const gate = evalsidechainparitygate(data.result)
      console.log(formatsidechainparityreport(gate))
      if (!gate.pass) {
        return 1
      }
    }

    main()
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-sidechain-parity.ts ---
async function rundaisyrunsidechainparity(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { SIDECHAIN_PARITY_PATCH_ID,
  SIDECHAIN_PARITY_RESULT,
  analyzeduckdepth,
  analyzeduckdepthpair,
  evalsidechainparitygate,
  formatsidechainparityreport,
  metricsfromsamples, } = await import('ops/lib/daisy-parity/sidechainparity')
    const { decodewav } = await import('tasks/lib/parity/parity-wav.ts')
    const { SIDECHAIN_SCENARIO_ID } = await import('zss/feature/synth/backend/daisy/sidechainscenario.ts')
    /**
     * Offline sidechain parity: SC on/off duck depth + optional Tone compare.
     *
     * Usage:
     *   yarn sidechain-parity:render
     */










    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9886
    const OUTDIR = RENDERS_FIXTURES_DIR
    const PARITY_JSON = path.join(
      OUTDIR,
      `${SIDECHAIN_SCENARIO_ID}-sidechain-parity.json`,
    )
    const TONE_FIXTURE = path.join(
      PROJECT,
      'ops/fixtures/synth/wasm/parity-metrics-tone.json',
    )

    async function renderdaisypass(
      page: import('@playwright/test').Page,
      sidechainbypass: boolean,
    ): Promise<{ samples: Float32Array; samplerate: number }> {
      return page.evaluate(async (bypass) => {
        const { renderdaisysongpayload } =
          await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
        const { sidechainabscenario } =
          await import('/zss/feature/synth/backend/daisy/sidechainscenario.ts')
        const scenario = { ...sidechainabscenario(), sidechainbypass: bypass }
        const payload = await renderdaisysongpayload(scenario)
        const binary = atob(payload.wavbase64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        const view = new DataView(bytes.buffer)
        const samplerate = view.getUint32(24, true)
        const samplecount = view.getUint32(40, true) / 2
        const samples = new Float32Array(samplecount)
        let offset = 44
        for (let i = 0; i < samplecount; i++) {
          samples[i] = view.getInt16(offset, true) / 0x8000
          offset += 2
        }
        return { samples, samplerate }
      }, sidechainbypass)
    }

    async function rendertonefixture(
      page: import('@playwright/test').Page,
    ): Promise<{ peakdb: number; rmsdb: number } | undefined> {
      try {
        return await page.evaluate(async () => {
          const { rendertonelevelscenario } =
            await import('/ops/lib/daisy-parity/toneparityrender.ts')
          const { sidechainabscenario } =
            await import('/zss/feature/synth/backend/daisy/sidechainscenario.ts')
          const { audiobuffermetrics } =
            await import('/ops/lib/daisy-parity/paritymetrics.ts')
          const buffer = await rendertonelevelscenario(sidechainabscenario())
          const m = audiobuffermetrics(buffer)
          return { peakdb: m.peakdb, rmsdb: m.rmsdb }
        })
      } catch (err) {
        console.warn('Tone render skipped:', err)
        return undefined
      }
    }

    function loadtonefixture(): { peakdb: number; rmsdb: number } | undefined {
      if (!fs.existsSync(TONE_FIXTURE)) {
        return undefined
      }
      const fixtures = JSON.parse(fs.readFileSync(TONE_FIXTURE, 'utf8')) as {
        patches: Record<string, { peakdb: number; rmsdb: number }>
      }
      return fixtures.patches[SIDECHAIN_PARITY_PATCH_ID]
    }

    async function main() {
      fs.mkdirSync(OUTDIR, { recursive: true })

      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser()

      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(PLAYWRIGHT_SCENARIO_TIMEOUT_MS)
        page.on('console', (msg) => {
          const text = msg.text()
          if (text.startsWith('[sidechain') || text.startsWith('[daisy')) {
            console.log(text)
          }
        })
        await page.goto(parityhosturl(PORT), { waitUntil: 'domcontentloaded' })

        console.log('Rendering duck-bg-stab SC ON…')
        const on = await renderdaisypass(page, false)
        console.log('Rendering duck-bg-stab SC OFF…')
        const off = await renderdaisypass(page, true)

        const tonelive = await rendertonefixture(page)
        await page.close()

        const tonefixture = loadtonefixture()
        const tonemetrics = tonelive ?? tonefixture

        const result: SIDECHAIN_PARITY_RESULT = {
          duckon: analyzeduckdepth(on.samples, on.samplerate),
          duckoff: analyzeduckdepth(off.samples, off.samplerate),
          abduckdepthdb: analyzeduckdepthpair(
            on.samples,
            off.samples,
            on.samplerate,
          ),
          daisymetrics: metricsfromsamples(on.samples, on.samplerate),
          tonemetrics: tonemetrics
            ? {
                peakdb: tonemetrics.peakdb,
                rmsdb: tonemetrics.rmsdb,
                length: on.samples.length,
                samplerate: on.samplerate,
                centroidhz: 0,
                bandlow: 0,
                bandmid: 0,
                bandhigh: 0,
              }
            : undefined,
        }

        const gate = evalsidechainparitygate(result)
        fs.writeFileSync(PARITY_JSON, JSON.stringify({ result, gate }, null, 2))
        fs.writeFileSync(
          path.join(OUTDIR, `${SIDECHAIN_SCENARIO_ID}-sidechain-parity.txt`),
          formatsidechainparityreport(gate),
        )

        console.log('')
        console.log(formatsidechainparityreport(gate))
        console.log('')
        console.log(`JSON: ${PARITY_JSON}`)
      } finally {
        await browser.close()
        await stopparityvite(parity)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-sidechain-render.ts ---
async function rundaisyrunsidechainrender(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { SIDECHAIN_SCENARIO_ID,
  sidechainabscenario, } = await import('zss/feature/synth/backend/daisy/sidechainscenario.ts')
    /**
     * Offline A/B render for play-bus sidechain duck (duck-bg-stab scenario).
     *
     * Usage:
     *   yarn sidechain:render
     *   yarn sidechain:render --no-sc
     *   yarn sidechain:render:ab
     *
     * Outputs:
     *   ops/fixtures/renders/duck-bg-stab.wav (default, sidechain ON)
     *   ops/fixtures/renders/duck-bg-stab-sc-on.* / -sc-off.* (--ab)
     *
     * Browser preview (yarn app:dev):
     *   yarn sidechain-song:render
     */








    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9882
    const OUTDIR = RENDERS_FIXTURES_DIR

    type RENDER_PASS = {
      suffix: string
      sidechainbypass: boolean
    }

    function parsepasses(): RENDER_PASS[] {
      const ab = ctx.args.includes('--ab')
      const nosc = ctx.args.includes('--no-sc')
      if (ab) {
        return [
          { suffix: '-sc-on', sidechainbypass: false },
          { suffix: '-sc-off', sidechainbypass: true },
        ]
      }
      if (nosc) {
        return [{ suffix: '-sc-off', sidechainbypass: true }]
      }
      return [{ suffix: '', sidechainbypass: false }]
    }

    async function renderpass(
      page: import('@playwright/test').Page,
      sidechainbypass: boolean,
    ): Promise<SONG_RENDER_PAYLOAD> {
      return page.evaluate(async (bypass) => {
        const { renderdaisysongpayload } =
          await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
        const { sidechainabscenario } =
          await import('/zss/feature/synth/backend/daisy/sidechainscenario.ts')
        const scenario = {
          ...sidechainabscenario(),
          sidechainbypass: bypass,
        }
        console.warn('[sidechain] booting daisy wasm…')
        const payload = await renderdaisysongpayload(scenario)
        console.warn('[sidechain] render complete, encoding wav…')
        return payload
      }, sidechainbypass)
    }

    async function main() {
      fs.mkdirSync(OUTDIR, { recursive: true })

      const scenario = sidechainabscenario()
      const passes = parsepasses()
      console.log('Sidechain scenario:', scenario.id, scenario.description)

      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser()

      try {
        for (const pass of passes) {
          const passpage = await browser.newPage()
          passpage.setDefaultTimeout(600_000)
          passpage.on('console', (msg) => {
            const text = msg.text()
            if (
              text.startsWith('[sidechain]') ||
              text.startsWith('[daisy boot]') ||
              text.startsWith('[daisy render]')
            ) {
              console.log(text)
            }
          })

          await passpage.goto(parityhosturl(PORT), { waitUntil: 'domcontentloaded' })
          console.log(
            `Rendering ${SIDECHAIN_SCENARIO_ID}${pass.suffix || ''} (sidechain ${pass.sidechainbypass ? 'OFF' : 'ON'})…`,
          )
          const payload = await renderpass(passpage, pass.sidechainbypass)
          await passpage.close()
          const typed = payload
          const basename = `${typed.meta.scenarioid}${pass.suffix}`
          const wavpath = path.join(OUTDIR, `${basename}.wav`)
          const jsonpath = path.join(OUTDIR, `${basename}.json`)
          const txtpath = path.join(OUTDIR, `${basename}.txt`)

          fs.writeFileSync(wavpath, Buffer.from(typed.wavbase64, 'base64'))
          fs.writeFileSync(
            jsonpath,
            JSON.stringify(
              {
                meta: typed.meta,
                sidechainbypass: pass.sidechainbypass,
                metrics: typed.metrics,
                loudestwindows: typed.loudestwindows,
              },
              null,
              2,
            ),
          )
          fs.writeFileSync(txtpath, typed.report)

          console.log('')
          console.log(typed.report)
          console.log('')
          console.log(`WAV:  ${wavpath}`)
          console.log(`JSON: ${jsonpath}`)
          console.log(`TXT:  ${txtpath}`)
          console.log('')
          console.log(`Listen: afplay ${wavpath}`)
        }

      } finally {
        await browser.close()
        await stopparityvite(parity)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-song-offline-render-tone.ts ---
async function rundaisyrunsongofflinerendertone(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { levelissuescenario,
  levelissuesongmeta, } = await import('zss/feature/synth/backend/daisy/levelissuesong.ts')
    /**
     * Offline render of the user level-issue song via archived Tone.js → WAV + metrics.
     *
     * Usage:
     *   yarn level-issue-song:render:tone
     *
     * Outputs:
     *   ops/fixtures/renders/level-issue-song-tone.wav
     *   ops/fixtures/renders/level-issue-song-tone.json
     *   ops/fixtures/renders/level-issue-song-tone.txt
     */








    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9881
    const OUTDIR = RENDERS_FIXTURES_DIR

    async function main() {
      fs.mkdirSync(OUTDIR, { recursive: true })

      const meta = levelissuesongmeta()
      console.log('Song meta:', JSON.stringify(meta, null, 2))

      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser()
      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(600_000)
        console.log('Rendering Tone offline (this may take several minutes)…')
        await page.goto(parityhosturl(PORT), {
          waitUntil: 'domcontentloaded',
        })

        const payload = await page.evaluate(async () => {
          const { rendertonesongpayload } =
            await import('/zss/feature/synth/backend/wasm/tonesongrender.ts')
          const { levelissuescenario } =
            await import('/zss/feature/synth/backend/daisy/levelissuesong.ts')
          return rendertonesongpayload(levelissuescenario())
        })

        const typed = payload as SONG_RENDER_PAYLOAD
        const wavpath = path.join(OUTDIR, `${typed.meta.scenarioid}.wav`)
        const jsonpath = path.join(OUTDIR, `${typed.meta.scenarioid}.json`)
        const txtpath = path.join(OUTDIR, `${typed.meta.scenarioid}.txt`)

        fs.writeFileSync(wavpath, Buffer.from(typed.wavbase64, 'base64'))
        fs.writeFileSync(
          jsonpath,
          JSON.stringify(
            {
              meta: typed.meta,
              songmeta: meta,
              metrics: typed.metrics,
              loudestwindows: typed.loudestwindows,
            },
            null,
            2,
          ),
        )
        fs.writeFileSync(txtpath, typed.report)

        console.log('')
        console.log(typed.report)
        console.log('')
        console.log(`WAV:  ${wavpath}`)
        console.log(`JSON: ${jsonpath}`)
        console.log(`TXT:  ${txtpath}`)
        console.log('')
        console.log(`Listen: afplay ${wavpath}`)
        console.log(
          `Compare Daisy: afplay ${path.join(OUTDIR, 'level-issue-song.wav')}`,
        )
      } finally {
        await browser.close()
        await stopparityvite(parity)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-song-offline-render.ts ---
async function rundaisyrunsongofflinerender(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { levelissuescenario,
  levelissuesongmeta, } = await import('zss/feature/synth/backend/daisy/levelissuesong.ts')
    /**
     * Offline render of the user level-issue song → WAV + metrics report.
     *
     * Usage:
     *   yarn level-issue-song:render
     *
     * Outputs:
     *   ops/fixtures/renders/level-issue-song.wav
     *   ops/fixtures/renders/level-issue-song.json
     *   ops/fixtures/renders/level-issue-song.txt
     */








    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9880
    const OUTDIR = RENDERS_FIXTURES_DIR

    async function main() {
      fs.mkdirSync(OUTDIR, { recursive: true })

      const meta = levelissuesongmeta()
      console.log('Song meta:', JSON.stringify(meta, null, 2))

      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser()
      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(600_000)
        console.log('Rendering in browser (this may take several minutes)…')
        await page.goto(parityhosturl(PORT), {
          waitUntil: 'domcontentloaded',
        })

        const payload = await page.evaluate(async () => {
          const { renderdaisysongpayload } =
            await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
          const { levelissuescenario } =
            await import('/zss/feature/synth/backend/daisy/levelissuesong.ts')
          return renderdaisysongpayload(levelissuescenario())
        })

        const typed = payload as SONG_RENDER_PAYLOAD
        const wavpath = path.join(OUTDIR, `${typed.meta.scenarioid}.wav`)
        const jsonpath = path.join(OUTDIR, `${typed.meta.scenarioid}.json`)
        const txtpath = path.join(OUTDIR, `${typed.meta.scenarioid}.txt`)

        fs.writeFileSync(wavpath, Buffer.from(typed.wavbase64, 'base64'))
        fs.writeFileSync(
          jsonpath,
          JSON.stringify(
            {
              meta: typed.meta,
              songmeta: meta,
              metrics: typed.metrics,
              loudestwindows: typed.loudestwindows,
            },
            null,
            2,
          ),
        )
        fs.writeFileSync(txtpath, typed.report)

        console.log('')
        console.log(typed.report)
        console.log('')
        console.log(`WAV:  ${wavpath}`)
        console.log(`JSON: ${jsonpath}`)
        console.log(`TXT:  ${txtpath}`)
        console.log('')
        console.log(`Listen: afplay ${wavpath}`)
      } finally {
        await browser.close()
        await stopparityvite(parity)
      }
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-sos-voice-gates.ts ---
async function rundaisyrunsosvoicegates(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { evalsosvoicegate } = await import('ops/lib/daisy-parity/sosvoicegate')
    const { SOS_VOICE_PATCHES } = await import('zss/feature/synth/backend/daisy/sosvoicepatches.ts')
    const ROOT = ctx.root
    const PROJECT = ctx.root
    const FIXTURE_PATH = path.join(
      PROJECT,
      'ops/fixtures/synth/daisy/sos-voice-fixtures.json',
    )
    const REGEN_PORT = 9883

    type FIXTURE_FILE = {
      patches: Record<string, PARITY_AUDIO_METRICS>
    }

    function loadfixtures(): FIXTURE_FILE {
      const raw = readFileSync(FIXTURE_PATH, 'utf8')
      return JSON.parse(raw) as FIXTURE_FILE
    }

    async function rendersospatch(
      page: import('@playwright/test').Page,
      patchid: string,
    ): Promise<PARITY_AUDIO_METRICS> {
      const parsed = await page.evaluate(
        async (args) => {
          const { runsosvoiceregen } =
            await import('/ops/lib/daisy-parity/sos-voice-regen-runner.ts')
          return runsosvoiceregen(args)
        },
        { patchid },
      )
      const metrics = parsed[patchid]
      if (!metrics) {
        throw new Error(`missing metrics for ${patchid}`)
      }
      return metrics
    }

    async function main() {
      const fixtures = loadfixtures()
      const handle = await startparityvite(PROJECT, REGEN_PORT)
      const browser = await launchparitybrowser()
      const page = await browser.newPage()
      page.setDefaultTimeout(180_000)
      await page.goto(parityhosturl(REGEN_PORT), {
        waitUntil: 'domcontentloaded',
        timeout: 180000,
      })
      const failures: string[] = []

      try {
        for (const patch of SOS_VOICE_PATCHES) {
          const expected = fixtures.patches[patch.id]
          if (!expected) {
            failures.push(`${patch.id} | missing fixture entry`)
            continue
          }
          const actual = await rendersospatch(page, patch.id)
          const gate = evalsosvoicegate(patch.id, actual, expected)
          if (!gate.pass) {
            failures.push(gate.reason)
          } else {
            console.log(gate.reason)
          }
        }
      } finally {
        await browser.close()
        await stopparityvite(handle)
      }

      if (failures.length > 0) {
        console.error('SOS voice gate failures:')
        for (const line of failures) {
          console.error(`  ${line}`)
        }
        return 1
      }
      console.log(`all ${SOS_VOICE_PATCHES.length} SOS voice patches passed`)
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-synth-env-parity-gates.ts ---
async function rundaisyrunsynthenvparitygates(ctx: TaskContext): Promise<number> {
  try {
    const fs = (await import('node:fs')).default
    const path = (await import('node:path')).default
    const { fileURLToPath } = await import('node:url')
    const { SYNTH_ENV_PARITY_RESULT,
  evalsynthenvparitygate,
  formatsynthenvparityreport, } = await import('ops/lib/daisy-parity/synthenvparitygate')
    const { SYNTH_ENV_PARITY_REQUIRED_IDS,
  SYNTH_ENV_PARITY_SCENARIOS, } = await import('ops/lib/daisy-parity/synthenvparityscenario')
    const { RENDERS_FIXTURES_DIR } = await import('ops/lib/fixturepaths')
    const { EXEC_GATE_TIMEOUT_MS,
  withscripttimeout, } = await import('tasks/lib/parity/parity-timeouts.ts')
    /**
     * Pass/fail gate for synth env parity renders.
     *
     * Usage: yarn synth-env-parity:test
     */







    const ROOT = ctx.root
    const PROJECT = ctx.root
    const OUTDIR = path.join(RENDERS_FIXTURES_DIR, 'synth-env-parity')

    async function rungates() {
      let failed = false
      const lines: string[] = []

      for (const scenario of SYNTH_ENV_PARITY_SCENARIOS) {
        const jsonpath = path.join(OUTDIR, `${scenario.id}.json`)
        if (!fs.existsSync(jsonpath)) {
          console.error(`missing ${jsonpath}`)
          console.error('run: yarn synth-env-parity:render')
          return 1
        }
        const data = JSON.parse(fs.readFileSync(jsonpath, 'utf8')) as {
          result: SYNTH_ENV_PARITY_RESULT
        }
        const gate = evalsynthenvparitygate(data.result)
        const rendersec =
          data.result.metrics.gatesec + data.result.metrics.releasesec + 1.5
        lines.push(formatsynthenvparityreport(gate, rendersec))
        lines.push('')

        if (!gate.pass && gate.required) {
          failed = true
          console.error(
            `FAIL (required) ${scenario.id}: ${gate.reasons.join('; ')}`,
          )
        } else if (!gate.pass) {
          console.warn(`WARN (advisory) ${scenario.id}: ${gate.reasons.join('; ')}`)
        }
      }

      console.log(lines.join('\n'))
      console.log(
        `Required scenarios: ${[...SYNTH_ENV_PARITY_REQUIRED_IDS].join(', ')}`,
      )

      if (failed) {
        return 1
      }
    }
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-synth-env-parity.ts ---
async function rundaisyrunsynthenvparity(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { evalsynthenvparitygate,
  formatsynthenvparityreport, } = await import('ops/lib/daisy-parity/synthenvparitygate')
    const { SYNTH_ENV_PARITY_SCENARIOS } = await import('ops/lib/daisy-parity/synthenvparityscenario')
    /**
     * Tone vs Daisy synth env parity (long release, multi-wave).
     *
     * Usage: yarn synth-env-parity:render
     */









    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9888
    const OUTDIR = path.join(RENDERS_FIXTURES_DIR, 'synth-env-parity')

    async function runrenders() {
      fs.mkdirSync(OUTDIR, { recursive: true })

      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser(60_000)
      const reportentries: {
        id: string
        gate: ReturnType<typeof evalsynthenvparitygate>
        rendersec: number
      }[] = []

      try {
        for (const scenario of SYNTH_ENV_PARITY_SCENARIOS) {
          console.log(`Rendering synth env parity: ${scenario.id}…`)
          const page = await browser.newPage()
          page.setDefaultTimeout(PLAYWRIGHT_SCENARIO_TIMEOUT_MS)
          await page.goto(parityhosturl(PORT), {
            waitUntil: 'domcontentloaded',
            timeout: PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
          })

          const payload = await page.evaluate(
            async ({ scenarioid, windowms }) => {
              const { runenvparityscenario } =
                await import('/ops/lib/daisy-parity/envparityrender.ts')
              const { arraybuffertobase64 } =
                await import('/zss/feature/synth/backend/daisy/daisysongrender.ts')
              const { SYNTH_ENV_PARITY_SCENARIOS } =
                await import('/ops/lib/daisy-parity/synthenvparityscenario.ts')
              const { analyzesynthenvparity } =
                await import('/ops/lib/daisy-parity/synthenvparity.ts')

              const scenario = SYNTH_ENV_PARITY_SCENARIOS.find(
                (s) => s.id === scenarioid,
              )
              if (!scenario) {
                throw new Error(`unknown scenario ${scenarioid}`)
              }
              const render = await runenvparityscenario(scenario, windowms)
              const analyzed = analyzesynthenvparity(
                scenario.id,
                render.daisysamples,
                render.daisysamplerate,
                render.tonemono,
                render.tonesamplerate,
                undefined,
                undefined,
                render.rendersec,
                windowms,
              )
              return {
                id: scenario.id,
                analyzed,
                rendersec: render.rendersec,
                report: render.report,
                daisywavbase64: arraybuffertobase64(render.daisywav),
                tonewavbase64: arraybuffertobase64(render.tonewav),
              }
            },
            { scenarioid: scenario.id, windowms: 46 },
          )

          fs.writeFileSync(
            path.join(OUTDIR, `${scenario.id}-daisy.wav`),
            Buffer.from(payload.daisywavbase64, 'base64'),
          )
          fs.writeFileSync(
            path.join(OUTDIR, `${scenario.id}-tone.wav`),
            Buffer.from(payload.tonewavbase64, 'base64'),
          )
          const gate = evalsynthenvparitygate(payload.analyzed)
          fs.writeFileSync(
            path.join(OUTDIR, `${scenario.id}.json`),
            JSON.stringify({ result: payload.analyzed, gate }, null, 2),
          )
          fs.writeFileSync(
            path.join(OUTDIR, `${scenario.id}.txt`),
            formatsynthenvparityreport(gate, payload.rendersec),
          )

          console.log(formatsynthenvparityreport(gate, payload.rendersec))
          console.log('')

          reportentries.push({
            id: scenario.id,
            gate,
            rendersec: payload.rendersec,
          })
          await page.close()
        }

        fs.writeFileSync(
          path.join(OUTDIR, 'report.json'),
          JSON.stringify({ scenarios: reportentries }, null, 2),
        )
      } finally {
        await browser.close()
        await stopparityvite(parity)
      }
    }
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

// --- run-voice-isolation-render.ts ---
async function rundaisyrunvoiceisolationrender(ctx: TaskContext): Promise<number> {
  try {
    const {
      path,
      readFileSync,
      writeFileSync,
      launchparitybrowser,
      parityhosturl,
      startparityvite,
      stopparityvite,
      withscripttimeout,
      RENDERS_FIXTURES_DIR,
    } = await loaddaisyparityruntime()
    const { LEVEL_ISSUE_SONG_ID,
  levelissuescenario,
  levelissuevoicerolesummary,
  levelissuevoicescenario, } = await import('zss/feature/synth/backend/daisy/levelissuesong.ts')
    /**
     * Per-voice offline renders for level-issue song → compare peak behavior by lane.
     *
     * Usage: yarn level-issue-voices:render
     */








    const ROOT = ctx.root
    const PROJECT = ctx.root
    const PORT = 9881
    const OUTDIR = path.join(RENDERS_FIXTURES_DIR, 'voice-isolation')
    const WINDOWMS = 46

    function peakbands(metrics: LEVEL_STABILITY_METRICS) {
      const bands = { hash: 0, eq: 0, dash: 0, dot: 0, space: 0 }
      for (const db of metrics.windowpeaksDb) {
        if (db > -10) {
          bands.hash++
        } else if (db > -20) {
          bands.eq++
        } else if (db > -35) {
          bands.dash++
        } else if (db > -50) {
          bands.dot++
        } else {
          bands.space++
        }
      }
      const n = metrics.windowpeaksDb.length
      const sorted = [...metrics.windowpeaksDb].sort((a, b) => a - b)
      const p10 = sorted[Math.floor(n * 0.1)]
      const p50 = sorted[Math.floor(n * 0.5)]
      const p90 = sorted[Math.floor(n * 0.9)]
      return { bands, n, p10, p50, p90, min: sorted[0], max: sorted[n - 1] }
    }

    function timelinascii(
      peaksdb: number[],
      durationsec: number,
      cols = 60,
    ): string {
      const timeline = Array(cols).fill(' ')
      for (let c = 0; c < cols; c++) {
        const t0 = (c / cols) * durationsec
        const t1 = ((c + 1) / cols) * durationsec
        const slice = peaksdb.slice(
          Math.floor((t0 * 1000) / WINDOWMS),
          Math.ceil((t1 * 1000) / WINDOWMS),
        )
        if (slice.length === 0) {
          continue
        }
        const maxp = Math.max(...slice)
        if (maxp > -10) {
          timeline[c] = '#'
        } else if (maxp > -20) {
          timeline[c] = '='
        } else if (maxp > -35) {
          timeline[c] = '-'
        } else if (maxp > -50) {
          timeline[c] = '.'
        }
      }
      return timeline.join('')
    }

    async function main() {
      fs.mkdirSync(OUTDIR, { recursive: true })

      const roles = levelissuevoicerolesummary()
      console.log('Voice lane roles (lines per play):')
      for (let v = 0; v < 4; v++) {
        console.log(`  voice ${v}:`, roles.roles[v])
      }
      console.log('')

      const scenarios = [
        levelissuescenario(),
        ...([0, 1, 2, 3] as const).map((v) => levelissuevoicescenario(v)),
      ]

      const parity = await startparityvite(PROJECT, PORT)
      const browser = await launchparitybrowser()
      const results: {
        id: string
        overallpeakdb: number
        p10: number
        p50: number
        p90: number
        spread: number
        bands: ReturnType<typeof peakbands>['bands']
        timeline: string
        durationsec: number
      }[] = []

      try {
        const page = await browser.newPage()
        await page.goto(parityhosturl(PORT), {
          waitUntil: 'domcontentloaded',
        })

        for (const scenario of scenarios) {
          console.log(`Rendering ${scenario.id}…`)
          const payload = await page.evaluate(
            async ({ scenarioid, windowms }) => {
              const { renderdaisylevelscenario } =
                await import('/zss/feature/synth/backend/daisy/daisylevelrender.ts')
              const { levelissuescenario, levelissuevoicescenario } =
                await import('/zss/feature/synth/backend/daisy/levelissuesong.ts')
              const { analyzelevelstability } =
                await import('/zss/feature/synth/backend/wasm/levelstabilitymetrics.ts')

              let scenario
              if (scenarioid === 'level-issue-song') {
                scenario = levelissuescenario()
              } else {
                const v = Number(scenarioid.replace('level-issue-song-voice-', ''))
                scenario = levelissuevoicescenario(v)
              }
              const render = await renderdaisylevelscenario(scenario)
              const metrics = analyzelevelstability(
                render.samples,
                render.samplerate,
                windowms,
              )
              return {
                id: scenario.id,
                rendersec: render.rendersec,
                metrics,
              }
            },
            { scenarioid: scenario.id, windowms: WINDOWMS },
          )

          const metrics = payload.metrics as LEVEL_STABILITY_METRICS
          const bands = peakbands(metrics)
          const timeline = timelinascii(metrics.windowpeaksDb, payload.rendersec)

          results.push({
            id: payload.id,
            overallpeakdb: metrics.overallpeakdb,
            p10: bands.p10,
            p50: bands.p50,
            p90: bands.p90,
            spread: bands.p90 - bands.p10,
            bands: bands.bands,
            timeline,
            durationsec: payload.rendersec,
          })

          console.log(
            `  peak ${metrics.overallpeakdb.toFixed(1)} dBFS  p10..p90 ${bands.p10.toFixed(1)}..${bands.p90.toFixed(1)}  spread ${(bands.p90 - bands.p10).toFixed(1)} dB`,
          )
        }
      } finally {
        await browser.close()
        await stopparityvite(parity)
      }

      const lines = [
        'Level-issue song — per-voice isolation',
        '',
        'Voice lane roles (non-empty lines):',
        ...([0, 1, 2, 3] as const).map((v) => {
          const r = roles.roles[v]
          const active = r.melody + r.drums + r.mixed
          return `  v${v}: melody=${r.melody} drums=${r.drums} mixed=${r.mixed} empty=${r.empty}  (${active} active)`
        }),
        '',
        'Peak timeline (# >-10  = >-20  - >-35  . >-50):',
        '',
      ]

      for (const row of results) {
        const pcteq = (
          (100 * row.bands.eq) /
          (row.bands.eq +
            row.bands.dash +
            row.bands.dot +
            row.bands.hash +
            row.bands.space)
        ).toFixed(0)
        lines.push(
          `${row.id.padEnd(28)} pk ${row.overallpeakdb.toFixed(1).padStart(6)}  spread ${row.spread.toFixed(1).padStart(5)}  = ${pcteq}%`,
        )
        lines.push(`  ${row.timeline}`)
        lines.push('')
      }

      const report = lines.join('\n')
      fs.writeFileSync(path.join(OUTDIR, 'report.txt'), report)
      fs.writeFileSync(
        path.join(OUTDIR, 'report.json'),
        JSON.stringify({ roles, results }, null, 2),
      )
      console.log('')
      console.log(report)
      console.log(`Report: ${OUTDIR}/report.txt`)
    }
    await main()
    return 0
  } catch (err) {
    console.error(err)
    return 1
  }
}

export const DAISY_TASKS: TaskDef[] = [
  def('daisy:build', {
    description: 'Build Daisy WASM native synth',
    run: shell('sh zss/feature/synth/backend/daisy/native/build-daisy.sh'),
  }),
  def('daisy:bundle:processor', {
    description: 'Bundle daisy audio worklet processor',
    run: handler(rundaisybundledaisyprocessor),
  }),
  def('daisy:lint', {
    description: 'clang-format check on daisy C++',
    run: handler((ctx) => runclangformat(ctx, 'check', 'daisy')),
  }),
  def('daisy:lint:fix', {
    description: 'Apply clang-format to daisy C++',
    run: handler((ctx) => runclangformat(ctx, 'fix', 'daisy')),
  }),
  def('daisy:bench:synth', {
    description: 'Daisy synth micro-benchmark',
    env: { ZSS_DAISY_BENCH: '1' },
    run: exec(['npx', 'tsx', 'ops/lib/daisy-parity/daisyperfbench.ts']),
  }),
  def('daisy:regression:test', {
    description: 'Jest + critical Playwright parity gates',
    tags: ['slow'],
    run: handler(rundaisyrundaisyregression),
  }),
  def('daisy:adsr-parity:test', {
    description: 'Short amsaw ADSR Jest + env parity',
    deps: ['daisy:adsr-parity:jest', 'daisy:env-parity:test'],
    run: { kind: 'tasks' },
  }),
  def('daisy:adsr-parity:jest', {
    description: 'Jest adsrenvcurve tests (internal)',
    run: jestexec('ops/tests/unit/feature/synth/backend/wasm/adsrenvcurve.test.ts'),
  }),
  def('daisy:env-parity:test', {
    description: 'Offline env ADSR parity render + gates',
    run: handler(rundaisyrunenvparity),
  }),
  def('daisy:fx-bus-metrics:test', {
    description: 'FX bus metrics offline test',
    run: handler(rundaisyrunfxbusmetrics),
  }),
  def('daisy:fixtures:regen:drums', {
    description: 'Regenerate daisy drum parity fixtures',
    run: handler(rundaisyregendaisydrumparityfixtures),
  }),
  def('daisy:fixtures:regen:tone', {
    description: 'Regenerate synth parity fixtures (tone backend)',
    run: handler((ctx) => rundaisyregensynthparityfixtures({ ...ctx, args: ['--tone', ...ctx.args] })),
  }),
  def('daisy:fixtures:regen:adsrenvcurve:tone', {
    description: 'Regenerate adsrenvcurve tone metrics fixture',
    run: handler(rundaisyregenadsrenvcurvetonefixture),
  }),
  def('daisy:fixtures:regen:env-adsr:tone', {
    description: 'Regenerate env ADSR tone parity metrics fixture',
    run: handler(rundaisyregenenvadsrparityfixtures),
  }),
  def('daisy:level-issue:song-compare:test', {
    description: 'Compare offline song renders (wasm vs tone)',
    run: handler(rundaisyrunlevelissuesongcompare),
  }),
  def('daisy:level-issue:song:render', {
    description: 'Offline song render (wasm)',
    run: handler(rundaisyrunsongofflinerender),
  }),
  def('daisy:level-issue:song:render:tone', {
    description: 'Offline song render (tone)',
    run: handler(rundaisyrunsongofflinerendertone),
  }),
  def('daisy:level-issue:voices:render', {
    description: 'Voice isolation offline render',
    run: handler(rundaisyrunvoiceisolationrender),
  }),
  def('daisy:level-stability:test', {
    description: 'Level stability offline matrix',
    run: handler(rundaisyrunlevelstability),
  }),
  def('daisy:level-stability:test:fxmatrix', {
    description: 'Level stability FX matrix filter',
    run: handler((ctx) => rundaisyrunlevelstability({ ...ctx, args: ['--filter', 'fxmatrix', ...ctx.args] })),
  }),
  def('daisy:pitch-stability:render', {
    description: 'Pitch stability offline render',
    run: handler(rundaisyrunpitchstability),
  }),
  def('daisy:pitch-stability:test', {
    description: 'Pitch stability gates',
    run: handler(rundaisyrunpitchstabilitygates),
  }),
  parityfull('pitch-stability'),
  def('daisy:play-drum-balance:calibrate', {
    description: 'Calibrate play vs drum balance (slow, dev-only)',
    tags: ['calibrate', 'slow'],
    run: handler(rundaisycalibrateplaydrumbalance),
  }),
  def('daisy:play-drum-balance:render', {
    description: 'Play vs drum balance offline render',
    run: handler(rundaisyrunplaydrumbalancerender),
  }),
  def('daisy:play-drum-balance:test', {
    description: 'Play vs drum balance gates',
    run: handler(rundaisyrunplaydrumbalancegates),
  }),
  parityfull('play-drum-balance'),
  def('daisy:play-drum:loop', {
    description: 'Watch native + play-drum parity loop',
    run: exec(['npx', 'tsx', 'tasks/lib/daisy/parity-loop.ts', '--suite', 'play-drum']),
  }),
  def('daisy:sidechain:parity:calibrate', {
    description: 'Calibrate sidechain parity (slow, dev-only)',
    tags: ['calibrate', 'slow'],
    run: handler(rundaisycalibratesidechainparity),
  }),
  def('daisy:sidechain:parity:render', {
    description: 'Sidechain parity offline render',
    run: handler(rundaisyrunsidechainparity),
  }),
  def('daisy:sidechain:parity:test', {
    description: 'Sidechain parity gates',
    run: handler(rundaisyrunsidechainparitygates),
  }),
  parityfull('sidechain:parity'),
  def('daisy:sidechain:loop', {
    description: 'Watch native + sidechain parity loop',
    run: exec(['npx', 'tsx', 'tasks/lib/daisy/parity-loop.ts', '--suite', 'sidechain']),
  }),
  def('daisy:sidechain:render', {
    description: 'Sidechain demo offline render',
    run: handler(rundaisyrunsidechainrender),
  }),
  def('daisy:sidechain:render:ab', {
    description: 'Sidechain demo A/B offline render',
    run: handler((ctx) => rundaisyrunsidechainrender({ ...ctx, args: ['--ab', ...ctx.args] })),
  }),
  def('daisy:sos-voice:fixtures:regen', {
    description: 'Regenerate SOS voice parity fixtures',
    run: handler(rundaisyregensosvoicefixtures),
  }),
  def('daisy:sos-voices:test', {
    description: 'SOS voice parity gates',
    run: handler(rundaisyrunsosvoicegates),
  }),
  tasksonly(
    'daisy:sos-voices:test:full',
    'Regenerate SOS voice fixtures and run gates',
    ['daisy:build', 'daisy:sos-voice:fixtures:regen', 'daisy:sos-voices:test'],
    { tags: ['slow'] },
  ),
  def('daisy:synth-env:calibrate', {
    description: 'Calibrate synth env parity (slow, dev-only)',
    tags: ['calibrate', 'slow'],
    run: handler(rundaisycalibratesynthenvparity),
  }),
  def('daisy:synth-env:render', {
    description: 'Synth env parity offline render',
    run: handler(rundaisyrunsynthenvparity),
  }),
  def('daisy:synth-env:test', {
    description: 'Synth env parity gates',
    run: handler(rundaisyrunsynthenvparitygates),
  }),
  parityfull('synth-env'),
  def('daisy:synth-env:loop', {
    description: 'Watch native + synth-env parity loop',
    run: exec(['npx', 'tsx', 'tasks/lib/daisy/parity-loop.ts', '--suite', 'synth-env']),
  }),
  def('daisy:notepop:loop', {
    description: 'Watch native + notepop parity loop',
    run: exec(['npx', 'tsx', 'tasks/lib/daisy/parity-loop.ts', '--suite', 'notepop']),
  }),
  def('daisy:notepop:render', {
    description: 'Notepop offline render',
    run: handler(rundaisyrunnotepoprender),
  }),
  def('daisy:notepop:render:ab', {
    description: 'Notepop A/B offline render',
    run: handler((ctx) => rundaisyrunnotepoprender({ ...ctx, args: ['--ab', ...ctx.args] })),
  }),
  def('daisy:notepop:test', {
    description: 'Notepop parity gates',
    run: handler(rundaisyrunnotepopgates),
  }),
  parityfull('notepop', { render: 'daisy:notepop:render:ab' }),
]
