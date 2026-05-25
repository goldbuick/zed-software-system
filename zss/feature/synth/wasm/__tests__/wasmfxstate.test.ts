import { tonenotationseconds } from 'zss/feature/synth/playnotation'

import {
  WASM_FX_PARAM_IDX,
  WASM_FX_PARAM_OFFSET,
  WASM_FX_SAB_LEN,
  WASM_FX_SEND_COUNT,
  WASM_FX_SEND_IDX,
  applywasmfxconfig,
  defaultwasmfxsab,
  replaywasmfxfromstate,
} from '../wasmfxstate'

describe('wasmfxstate', () => {
  it('seeds default chain params', () => {
    const sab = defaultwasmfxsab()
    expect(sab).toHaveLength(WASM_FX_SAB_LEN)
    expect(sab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.ECHO_DELAY]).toBeCloseTo(
      tonenotationseconds('8n'),
      4,
    )
    expect(sab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.FC_RATE]).toBe(32)
    expect(
      sab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.VIBRATO_MAXDELAY],
    ).toBe(0.02)
    expect(sab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.VIBRATO_DEPTH]).toBe(0)
    expect(sab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.VIBRATO_FREQ]).toBe(5)
  })

  it('maps echo on to group 0 send', () => {
    const sab = defaultwasmfxsab()
    expect(applywasmfxconfig(sab, 0, 'echo', 'on', '')).toBe(true)
    expect(sab[WASM_FX_SEND_IDX.ECHO]).toBeGreaterThan(0)
    expect(sab[WASM_FX_SEND_COUNT + WASM_FX_SEND_IDX.ECHO]).toBe(0)
  })

  it('maps fcrush autofilter autowah on to group 0 send', () => {
    const sab = defaultwasmfxsab()
    expect(applywasmfxconfig(sab, 0, 'fcrush', 'on', '')).toBe(true)
    expect(applywasmfxconfig(sab, 0, 'fc', 'on', '')).toBe(true)
    expect(applywasmfxconfig(sab, 0, 'autofilter', 'on', '')).toBe(true)
    expect(applywasmfxconfig(sab, 0, 'autowah', 'on', '')).toBe(true)
    expect(applywasmfxconfig(sab, 0, 'distort', 'on', '')).toBe(true)
    expect(sab[WASM_FX_SEND_IDX.FC]).toBeGreaterThan(0)
    expect(sab[WASM_FX_SEND_IDX.AUTOFILTER]).toBeGreaterThan(0)
    expect(sab[WASM_FX_SEND_IDX.AUTOWAH]).toBeGreaterThan(0)
    expect(sab[WASM_FX_SEND_IDX.DISTORTION]).toBeGreaterThan(0)
    expect(sab[WASM_FX_SEND_IDX.AUTOWAH]).toBeGreaterThan(
      sab[WASM_FX_SEND_IDX.FC],
    )
    expect(sab[WASM_FX_SEND_IDX.DISTORTION]).toBe(
      sab[WASM_FX_SEND_IDX.AUTOWAH],
    )
  })

  it('updates autofilter and autowah params', () => {
    const sab = defaultwasmfxsab()
    expect(applywasmfxconfig(sab, 0, 'autofilter', 'depth', 0.8)).toBe(true)
    expect(applywasmfxconfig(sab, 0, 'autowah', 'sensitivity', 0.7)).toBe(
      true,
    )
    expect(
      sab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.AUTOFILTER_DEPTH],
    ).toBe(0.8)
    expect(
      sab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.AUTOWAH_SENS],
    ).toBe(0.7)
  })

  it('maps numeric send to linear gain', () => {
    const sab = defaultwasmfxsab()
    expect(applywasmfxconfig(sab, 1, 'fcrush', 50, '')).toBe(true)
    expect(sab[WASM_FX_SEND_COUNT + WASM_FX_SEND_IDX.FC]).toBeGreaterThan(0)
  })

  it('updates shared echo params', () => {
    const sab = defaultwasmfxsab()
    expect(applywasmfxconfig(sab, 0, 'echo', 'feedback', 0.5)).toBe(true)
    expect(
      sab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.ECHO_FEEDBACK],
    ).toBe(0.5)
  })

  it('replays persisted voicefx state', () => {
    const sab = defaultwasmfxsab()
    replaywasmfxfromstate(sab, {
      '0': {
        echo: { on: 'on' },
      },
      '1': {
        reverb: { on: 40 },
      },
    })
    expect(sab[WASM_FX_SEND_IDX.ECHO]).toBeGreaterThan(0)
    expect(sab[WASM_FX_SEND_COUNT + WASM_FX_SEND_IDX.REVERB]).toBeGreaterThan(0)
  })
})
