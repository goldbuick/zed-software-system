import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { PARITY_AUDIO_METRICS } from 'zss/feature/synth/backend/wasm/paritymetrics'
import {
  formatmetricsdelta,
  metricswithin,
} from 'zss/feature/synth/backend/wasm/paritymetrics'
import {
  DRUM_PARITY_PATCHES,
  ENVELOPE_ADSR_PARITY_PATCHES,
  FX_PARITY_PATCHES,
  MAIN_DYNAMICS_PARITY_PATCHES,
  WASM_PARITY_PATCHES,
} from 'zss/feature/synth/backend/wasm/paritypatches'
import {
  TONE_PARITY_EXCLUDED,
  paritytolerancesfor,
} from 'zss/feature/synth/backend/wasm/paritytolerances'

type PARITY_FIXTURE_FILE = {
  patches: Record<string, PARITY_AUDIO_METRICS>
}

const USE_TONE_REFERENCE = process.env.ZSS_TONE_REFERENCE === '1'
const USE_DAISY_PARITY = process.env.ZSS_DAISY_PARITY === '1'
const FIXTURE_PATH = path.join(
  __dirname,
  '../__fixtures__/parity-metrics-tone.json',
)
const DAISY_DRUM_FIXTURE_PATH = path.join(
  __dirname,
  '../__fixtures__/parity-metrics-daisy.json',
)

function loadfixtures(): PARITY_FIXTURE_FILE {
  const raw = readFileSync(FIXTURE_PATH, 'utf8')
  return JSON.parse(raw) as PARITY_FIXTURE_FILE
}

function loaddaisydrumfixtures(): PARITY_FIXTURE_FILE {
  const raw = readFileSync(DAISY_DRUM_FIXTURE_PATH, 'utf8')
  return JSON.parse(raw) as PARITY_FIXTURE_FILE
}

function expectedmetrics(
  patchid: string,
  voicefixtures: PARITY_FIXTURE_FILE,
): PARITY_AUDIO_METRICS | undefined {
  if (USE_DAISY_PARITY && patchid.startsWith('drum')) {
    return loaddaisydrumfixtures().patches[patchid]
  }
  return voicefixtures.patches[patchid]
}

describe('wasm parity fixtures manifest', () => {
  it('includes every tone-backed voice patch id in tone fixtures', () => {
    const fixtures = loadfixtures()
    for (const patch of WASM_PARITY_PATCHES) {
      if ((TONE_PARITY_EXCLUDED as readonly string[]).includes(patch.id)) {
        continue
      }
      expect(fixtures.patches[patch.id]).toBeDefined()
    }
  })

  it('lists drum, fx, and main dynamics parity patch ids', () => {
    expect(DRUM_PARITY_PATCHES.length).toBe(10)
    expect(FX_PARITY_PATCHES.length).toBe(7)
    expect(MAIN_DYNAMICS_PARITY_PATCHES.length).toBe(5)
  })

  it('includes every drum patch id in daisy fixtures', () => {
    const fixtures = loaddaisydrumfixtures()
    for (const patch of DRUM_PARITY_PATCHES) {
      expect(fixtures.patches[patch.id]).toBeDefined()
    }
  })

  it('includes every envelope ADSR patch id in tone fixtures', () => {
    const fixtures = loadfixtures()
    for (const patch of ENVELOPE_ADSR_PARITY_PATCHES) {
      expect(fixtures.patches[patch.id]).toBeDefined()
    }
  })
})

const CAN_RENDER_PARITY =
  typeof OfflineAudioContext !== 'undefined' &&
  typeof document !== 'undefined' &&
  process.env.ZSS_PARITY_RENDER === '1' &&
  USE_DAISY_PARITY

async function loadrenderer() {
  const mod = await import('../../daisy/daisyparityrender')
  return {
    voice: mod.renderdaisyparitypatch,
    drum: mod.renderdaisyparitydrumpatch,
    fx: mod.renderdaisyparityfxpatch,
    main: mod.renderdaisyparitymainpatch,
  }
}

;(CAN_RENDER_PARITY ? describe : describe.skip)(
  'daisy parity offline renders',
  () => {
    it('matches committed reference metrics within tolerance', async () => {
      const render = await loadrenderer()
      const fixtures = loadfixtures()
      const failures: string[] = []

      async function checkpatch(
        patchid: string,
        renderfn: () => Promise<PARITY_AUDIO_METRICS>,
      ) {
        if (
          USE_TONE_REFERENCE &&
          (TONE_PARITY_EXCLUDED as readonly string[]).includes(patchid)
        ) {
          return
        }
        const expected = expectedmetrics(patchid, fixtures)
        if (!expected) {
          failures.push(`${patchid} | missing fixture`)
          return
        }
        const actual = await renderfn()
        const tol = paritytolerancesfor(patchid)
        if (
          !metricswithin(
            actual,
            expected,
            tol.rmsdbtol,
            tol.peakdbtol,
            tol.centroidhztol,
            tol.bandratiotol,
          )
        ) {
          failures.push(formatmetricsdelta(patchid, actual, expected))
        }
      }

      for (const patch of WASM_PARITY_PATCHES) {
        await checkpatch(patch.id, () => render.voice(patch))
      }
      for (const patch of DRUM_PARITY_PATCHES) {
        await checkpatch(patch.id, () => render.drum(patch))
      }
      for (const patch of FX_PARITY_PATCHES) {
        await checkpatch(patch.id, () => render.fx(patch))
      }
      for (const patch of MAIN_DYNAMICS_PARITY_PATCHES) {
        await checkpatch(patch.id, () => render.main(patch))
      }
      for (const patch of ENVELOPE_ADSR_PARITY_PATCHES) {
        await checkpatch(patch.id, () => render.voice(patch))
      }

      if (failures.length > 0) {
        throw new Error(failures.join('\n'))
      }
    }, 240000)
  },
)
