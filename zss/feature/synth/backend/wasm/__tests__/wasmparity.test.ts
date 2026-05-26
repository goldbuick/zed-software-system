import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { PARITY_AUDIO_METRICS } from '../paritymetrics'
import { metricswithin } from '../paritymetrics'
import {
  WASM_PARITY_PATCHES,
  WASM_PARITY_PEAK_DB_TOL,
  WASM_PARITY_RMS_DB_TOL,
} from '../paritypatches'

type PARITY_FIXTURE_FILE = {
  patches: Record<string, PARITY_AUDIO_METRICS>
}

const FIXTURE_PATH = path.join(__dirname, '../__fixtures__/parity-metrics.json')

function loadfixtures(): PARITY_FIXTURE_FILE {
  const raw = readFileSync(FIXTURE_PATH, 'utf8')
  return JSON.parse(raw) as PARITY_FIXTURE_FILE
}

describe('wasm parity fixtures manifest', () => {
  it('includes every broad patch id', () => {
    const fixtures = loadfixtures()
    for (const patch of WASM_PARITY_PATCHES) {
      expect(fixtures.patches[patch.id]).toBeDefined()
    }
  })
})

const CAN_RENDER_PARITY =
  typeof OfflineAudioContext !== 'undefined' &&
  typeof document !== 'undefined' &&
  process.env.ZSS_PARITY_RENDER === '1'

;(CAN_RENDER_PARITY ? describe : describe.skip)(
  'wasm parity offline renders',
  () => {
    it('matches committed tone reference metrics within tolerance', async () => {
      const { renderwasmparitypatch } = await import('../wasmparityrender')
      const fixtures = loadfixtures()
      for (const patch of WASM_PARITY_PATCHES) {
        const expected = fixtures.patches[patch.id]
        const actual = await renderwasmparitypatch(patch)
        expect(
          metricswithin(
            actual,
            expected,
            WASM_PARITY_RMS_DB_TOL,
            WASM_PARITY_PEAK_DB_TOL,
          ),
        ).toBe(true)
      }
    }, 120000)
  },
)

describe('wasm parity play code', () => {
  it('includes FM helper and per-voice volume gain', async () => {
    const { WASM_SYNTH_VOICE_PLAY_CODE } = await import('../voiceplaycode')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fmcarriersample')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function voicevolumegain')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('voicecfgvolume')
  })
})
