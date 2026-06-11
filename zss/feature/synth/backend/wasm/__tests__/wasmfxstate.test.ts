import {
  WASM_FX_GROUP_COUNT,
  WASM_FX_PARAM_IDX,
  WASM_FX_PARAM_OFFSET,
  WASM_FX_SAB_LEN,
  WASM_FX_SEND_COUNT,
  WASM_FX_SEND_IDX,
  applywasmfxconfig,
  defaultwasmfxsab,
  replaywasmfxfromstate,
  wasmfxgroupparambase,
} from 'zss/feature/synth/backend/wasm/wasmfxstate'
import { tonenotationseconds } from 'zss/feature/synth/playnotation'

describe('wasmfxstate', () => {
  it('seeds default chain params for every bus', () => {
    const sab = defaultwasmfxsab()
    expect(sab).toHaveLength(WASM_FX_SAB_LEN)
    expect(WASM_FX_SAB_LEN).toBe(
      WASM_FX_GROUP_COUNT * WASM_FX_SEND_COUNT + WASM_FX_GROUP_COUNT * 20,
    )
    for (let group = 0; group < WASM_FX_GROUP_COUNT; group++) {
      const parambase = wasmfxgroupparambase(group)
      expect(sab[parambase + WASM_FX_PARAM_IDX.ECHO_DELAY]).toBeCloseTo(
        tonenotationseconds('8n'),
        4,
      )
      expect(sab[parambase + WASM_FX_PARAM_IDX.FC_RATE]).toBe(32)
    }
    expect(
      sab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.ECHO_DELAY],
    ).toBeCloseTo(tonenotationseconds('8n'), 4)
  })

  it('maps echo on to group 0 send only', () => {
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
  })

  it('maps all autowah params to per-group sab slots', () => {
    const sab = defaultwasmfxsab()
    const parambase = wasmfxgroupparambase(2)
    expect(applywasmfxconfig(sab, 2, 'autowah', 'basefrequency', 200)).toBe(
      true,
    )
    expect(applywasmfxconfig(sab, 2, 'autowah', 'octaves', 4)).toBe(true)
    expect(applywasmfxconfig(sab, 2, 'autowah', 'sensitivity', -20)).toBe(true)
    expect(applywasmfxconfig(sab, 2, 'autowah', 'gain', 6)).toBe(true)
    expect(applywasmfxconfig(sab, 2, 'autowah', 'follower', 0.05)).toBe(true)
    expect(sab[parambase + WASM_FX_PARAM_IDX.AUTOWAH_BASE_FREQ]).toBe(200)
    expect(
      sab[WASM_FX_PARAM_OFFSET + WASM_FX_PARAM_IDX.AUTOWAH_BASE_FREQ],
    ).not.toBe(200)
  })

  it('updates autofilter params per group', () => {
    const sab = defaultwasmfxsab()
    expect(applywasmfxconfig(sab, 1, 'autofilter', 'depth', 0.8)).toBe(true)
    expect(applywasmfxconfig(sab, 1, 'autofilter', 'type', 'highpass')).toBe(
      true,
    )
    const parambase = wasmfxgroupparambase(1)
    expect(sab[parambase + WASM_FX_PARAM_IDX.AUTOFILTER_DEPTH]).toBe(0.8)
    expect(sab[parambase + WASM_FX_PARAM_IDX.AUTOFILTER_TYPE]).toBe(1)
    expect(
      sab[wasmfxgroupparambase(0) + WASM_FX_PARAM_IDX.AUTOFILTER_DEPTH],
    ).toBe(0.5)
  })

  it('maps numeric send to linear gain on target bus', () => {
    const sab = defaultwasmfxsab()
    expect(applywasmfxconfig(sab, 3, 'fcrush', 50, '')).toBe(true)
    expect(sab[3 * WASM_FX_SEND_COUNT + WASM_FX_SEND_IDX.FC]).toBeGreaterThan(0)
    expect(sab[WASM_FX_SEND_IDX.FC]).toBe(0)
  })

  it('updates echo params per group', () => {
    const sab = defaultwasmfxsab()
    expect(applywasmfxconfig(sab, 0, 'echo', 'feedback', 0.5)).toBe(true)
    expect(applywasmfxconfig(sab, 1, 'echo', 'feedback', 0.25)).toBe(true)
    expect(sab[wasmfxgroupparambase(0) + WASM_FX_PARAM_IDX.ECHO_FEEDBACK]).toBe(
      0.5,
    )
    expect(sab[wasmfxgroupparambase(1) + WASM_FX_PARAM_IDX.ECHO_FEEDBACK]).toBe(
      0.25,
    )
  })

  it('accepts echo delaytime as seconds or notation', () => {
    const sab = defaultwasmfxsab()
    const parambase = wasmfxgroupparambase(0)
    expect(applywasmfxconfig(sab, 0, 'echo', 'delaytime', 1)).toBe(true)
    expect(sab[parambase + WASM_FX_PARAM_IDX.ECHO_DELAY]).toBe(1)
    expect(applywasmfxconfig(sab, 0, 'echo', 'delaytime', '8n')).toBe(true)
    expect(sab[parambase + WASM_FX_PARAM_IDX.ECHO_DELAY]).toBeCloseTo(
      tonenotationseconds('8n'),
      4,
    )
    expect(applywasmfxconfig(sab, 0, 'echo', 'delaytime', '128n')).toBe(true)
    expect(sab[parambase + WASM_FX_PARAM_IDX.ECHO_DELAY]).toBeCloseTo(
      tonenotationseconds('128n'),
      4,
    )
    expect(applywasmfxconfig(sab, 0, 'echo', 'delaytime', 'bad')).toBe(false)
  })

  it('replays persisted voicefx state on four buses', () => {
    const sab = defaultwasmfxsab()
    replaywasmfxfromstate(sab, {
      '0': {
        echo: { on: 'on' },
      },
      '1': {
        reverb: { on: 40 },
      },
      '2': {
        fc: { on: 'on' },
      },
      '3': {
        autowah: { on: 30 },
      },
    })
    expect(sab[WASM_FX_SEND_IDX.ECHO]).toBeGreaterThan(0)
    expect(sab[WASM_FX_SEND_COUNT + WASM_FX_SEND_IDX.REVERB]).toBeGreaterThan(0)
    expect(sab[2 * WASM_FX_SEND_COUNT + WASM_FX_SEND_IDX.FC]).toBeGreaterThan(0)
    expect(
      sab[3 * WASM_FX_SEND_COUNT + WASM_FX_SEND_IDX.AUTOWAH],
    ).toBeGreaterThan(0)
  })
})
