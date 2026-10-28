import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { PARITY_AUDIO_METRICS } from 'ops/lib/daisy-parity/paritymetrics'
import {
  formatmetricsdelta,
  metricswithin,
} from 'ops/lib/daisy-parity/paritymetrics'
import {
  DRUM_PARITY_PATCHES,
  FX_PARITY_PATCHES,
  MAIN_DYNAMICS_PARITY_PATCHES,
} from 'ops/lib/daisy-parity/paritypatches'
import { paritytolerancesfor } from 'ops/lib/daisy-parity/paritytolerances'
import { SYNTH_WASM_FIXTURES_DIR } from 'ops/lib/fixturepaths'

type PARITY_FIXTURE_FILE = {
  patches: Record<string, PARITY_AUDIO_METRICS>
}

const USE_DAISY_PARITY = process.env.ZSS_DAISY_PARITY === '1'
const DAISY_DRUM_FIXTURE_PATH = path.join(
  SYNTH_WASM_FIXTURES_DIR,
  'parity-metrics-daisy.json',
)

function loaddaisydrumfixtures(): PARITY_FIXTURE_FILE {
  const raw = readFileSync(DAISY_DRUM_FIXTURE_PATH, 'utf8')
  return JSON.parse(raw) as PARITY_FIXTURE_FILE
}

describe('wasm parity fixtures manifest', () => {
  it('lists drum, fx, and main dynamics parity patch ids', () => {
    expect(DRUM_PARITY_PATCHES.length).toBe(12)
    expect(FX_PARITY_PATCHES.length).toBe(12)
    expect(MAIN_DYNAMICS_PARITY_PATCHES.length).toBe(5)
  })

  it('includes every drum patch id in daisy fixtures', () => {
    const fixtures = loaddaisydrumfixtures()
    for (const patch of DRUM_PARITY_PATCHES) {
      expect(fixtures.patches[patch.id]).toBeDefined()
    }
  })
})

const CAN_RENDER_PARITY =
  typeof OfflineAudioContext !== 'undefined' &&
  typeof document !== 'undefined' &&
  process.env.ZSS_PARITY_RENDER === '1' &&
  USE_DAISY_PARITY

;(CAN_RENDER_PARITY ? describe : describe.skip)(
  'daisy drum parity offline renders',
  () => {
    it('matches committed daisy drum metrics within tolerance', async () => {
      const { renderdaisyparitydrumpatch } =
        await import('ops/lib/daisy-parity/daisyparityrender')
      const fixtures = loaddaisydrumfixtures()
      const failures: string[] = []

      for (const patch of DRUM_PARITY_PATCHES) {
        const expected = fixtures.patches[patch.id]
        if (!expected) {
          failures.push(`${patch.id} | missing fixture`)
          continue
        }
        const actual = await renderdaisyparitydrumpatch(patch)
        const tol = paritytolerancesfor(patch.id)
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
          failures.push(formatmetricsdelta(patch.id, actual, expected))
        }
      }

      if (failures.length > 0) {
        throw new Error(failures.join('\n'))
      }
    }, 240000)
  },
)
