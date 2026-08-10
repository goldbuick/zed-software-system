import { defaultwasmalgoconfig } from 'zss/feature/synth/backend/wasm/wasmalgoconfigsab'
import { defaultwasmfxsab } from 'zss/feature/synth/backend/wasm/wasmfxstate'
import { defaultwasmoscconfig } from 'zss/feature/synth/backend/wasm/wasmoscconfigsab'
import type { WASM_REPLAY_STATE } from 'zss/feature/synth/backend/wasm/wasmreplaystate'
import { defaultwasmvoicestate } from 'zss/feature/synth/backend/wasm/wasmvoiceconfig'
import { findonsets } from 'zss/feature/synth/findonsets'
import type { SYNTH_NOTE_ENTRY } from 'zss/feature/synth/playnotation'
import { replaylengthsec } from 'zss/feature/synth/replaylength'

describe('findonsets (synthrecord gate)', () => {
  it('reports an onset within 30ms of each expected note-on', () => {
    const samplerate = 1000
    const samples = new Float32Array(samplerate * 2)
    samples[200] = 0.5
    samples[201] = 0.4
    samples[1000] = 0.5
    samples[1001] = 0.3
    const onsets = findonsets(samples, samplerate)
    expect(onsets).toHaveLength(2)
    expect(Math.abs(onsets[0]! - 0.2)).toBeLessThan(0.03)
    expect(Math.abs(onsets[1]! - 1.0)).toBeLessThan(0.03)
  })
})

/** Known two-note buffer used by the offline #synthrecord onset gate. */
const ONSET_GATE_TICKS: SYNTH_NOTE_ENTRY[] = [
  [0.2, [0, '8n', 'C4']],
  [1.0, [0, '8n', 'E4']],
]

function buildonsetgatereplay(): WASM_REPLAY_STATE {
  return {
    voicecfg: defaultwasmvoicestate(),
    oscconfig: defaultwasmoscconfig(),
    algoconfig: defaultwasmalgoconfig(),
    fxsab: defaultwasmfxsab(),
    playvolume: 80,
    bgplayvolume: 100,
  }
}

const CAN_RENDER_ONSET =
  typeof OfflineAudioContext !== 'undefined' &&
  typeof document !== 'undefined' &&
  process.env.ZSS_PARITY_RENDER === '1'

;(CAN_RENDER_ONSET ? describe : describe.skip)(
  'synthrecord offline onset gate',
  () => {
    jest.setTimeout(120_000)

    it('renders an onset within 30ms of every expected note-on', async () => {
      const { renderdaisyrecord } = await import(
        'zss/feature/synth/backend/daisy/daisyofflinerender'
      )
      const durationsec = replaylengthsec(1.0, ONSET_GATE_TICKS)
      const buffer = await renderdaisyrecord(
        buildonsetgatereplay(),
        ONSET_GATE_TICKS,
        durationsec,
      )
      const samples = buffer.getChannelData(0)
      const onsets = findonsets(samples, buffer.sampleRate)
      expect(onsets.length).toBeGreaterThanOrEqual(2)
      // Offline replay schedules against rebased time 0; allow a small
      // scheduler / envelope attack lag inside the 30ms gate.
      const expected = [0.2, 1.0]
      for (let i = 0; i < expected.length; i++) {
        const want = expected[i]!
        const nearest = onsets.reduce((best, t) =>
          Math.abs(t - want) < Math.abs(best - want) ? t : best,
        )
        expect(Math.abs(nearest - want)).toBeLessThan(0.03)
      }
    })
  },
)
