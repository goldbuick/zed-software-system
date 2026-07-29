import { WASM_PARITY_PATCHES } from 'ops/lib/daisy-parity/paritypatches'
import type { PARITY_AUDIO_METRICS } from 'ops/lib/daisy-parity/paritymetrics'
import {
  WASM_OSC_TYPE,
  familyosctobasic,
  parsewasmosc,
} from 'zss/feature/synth/backend/wasm/wasmosctype'

/**
 * Locks the fmsquare-sounds-like-sine regression.
 * SAB/parse always run; offline render runs when ZSS_PARITY_RENDER=1 in a
 * browser-like environment (same gate as wasmparity.test.ts).
 */
describe('fmsquare carrier contract', () => {
  it('parses to FM_SQUARE=21 with basic square carrier (not sine)', () => {
    expect(parsewasmosc('fmsquare')).toBe(WASM_OSC_TYPE.FM_SQUARE)
    expect(WASM_OSC_TYPE.FM_SQUARE).toBe(21)
    expect(familyosctobasic(21)).toBe(WASM_OSC_TYPE.SQUARE)
    expect(familyosctobasic(21)).not.toBe(WASM_OSC_TYPE.SINE)
    // Document the bare-subtract trap that caused the regression:
    expect(21 - 20).toBe(WASM_OSC_TYPE.SINE)
  })

  it('parity patch list includes fmsquare and fmsine for offline compare', () => {
    const ids = WASM_PARITY_PATCHES.map((p) => p.id)
    expect(ids).toContain('fmsquare-c4')
    expect(ids).toContain('fmsine-c4')
  })
})

const CAN_RENDER =
  typeof OfflineAudioContext !== 'undefined' &&
  typeof document !== 'undefined' &&
  process.env.ZSS_PARITY_RENDER === '1'

;(CAN_RENDER ? describe : describe.skip)(
  'fmsquare vs fmsine offline carrier lock',
  () => {
    jest.setTimeout(60_000)

    it('fmsquare spectral metrics differ from fmsine', async () => {
      const { renderdaisyparitypatch } = await import(
        'ops/lib/daisy-parity/daisyparityrender'
      )
      const fmsquare = WASM_PARITY_PATCHES.find((p) => p.id === 'fmsquare-c4')
      const fmsine = WASM_PARITY_PATCHES.find((p) => p.id === 'fmsine-c4')
      expect(fmsquare).toBeDefined()
      expect(fmsine).toBeDefined()
      const squaremetrics: PARITY_AUDIO_METRICS =
        await renderdaisyparitypatch(fmsquare!)
      const sinemetrics: PARITY_AUDIO_METRICS =
        await renderdaisyparitypatch(fmsine!)
      const centroiddelta = Math.abs(
        squaremetrics.centroidhz - sinemetrics.centroidhz,
      )
      const highdelta = Math.abs(
        squaremetrics.bandhigh - sinemetrics.bandhigh,
      )
      // Square carrier must show more high-band energy and/or a different
      // centroid than sine — identical metrics mean family map regressed.
      expect(centroiddelta > 80 || highdelta > 0.05).toBe(true)
    })
  },
)
