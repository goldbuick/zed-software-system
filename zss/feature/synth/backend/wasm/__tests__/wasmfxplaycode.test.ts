import { WASM_FX_PLAY_CODE } from '../wasmfxplaycode'
import { WASM_FX_GROUP_COUNT } from '../wasmfxstate'

describe('wasm fx play code', () => {
  it('declares per-bus fx state as arrays indexed by group', () => {
    expect(WASM_FX_PLAY_CODE).toContain('var fxechofb = [')
    expect(WASM_FX_PLAY_CODE).not.toContain('var fxechofb0 =')
    expect(WASM_FX_PLAY_CODE).toMatch(
      new RegExp(
        `var fxechodelay = \\[(?:new Maximilian\\.maxiDelayline\\(\\), ){${WASM_FX_GROUP_COUNT - 1}}new Maximilian\\.maxiDelayline\\(\\)\\];`,
      ),
    )
  })

  it('uses group indexing for echo feedback state', () => {
    expect(WASM_FX_PLAY_CODE).toContain('fxechofb[group]')
    expect(WASM_FX_PLAY_CODE).toContain('fxechodelay[group].dl')
  })

  it('includes cpu perf helpers for fx buses', () => {
    expect(WASM_FX_PLAY_CODE).toContain('function fxgrouphasactivesends')
    expect(WASM_FX_PLAY_CODE).toContain('function anyplayvibratosend')
    expect(WASM_FX_PLAY_CODE).toContain('if (!fxgrouphasactivesends(group))')
  })

  it('caches fixed reverb comb delay sample counts at init', () => {
    expect(WASM_FX_PLAY_CODE).toContain(
      'var FX_REV_COMB0_SAMPLES = fxsecstosamples(0.029)',
    )
    expect(WASM_FX_PLAY_CODE).toContain(
      'var FX_REV_COMB1_SAMPLES = fxsecstosamples(0.037)',
    )
    expect(WASM_FX_PLAY_CODE).toContain(
      'var FX_REV_COMB2_SAMPLES = fxsecstosamples(0.053)',
    )
    expect(WASM_FX_PLAY_CODE).toContain(
      'var FX_REV_COMB3_SAMPLES = fxsecstosamples(0.067)',
    )
    expect(WASM_FX_PLAY_CODE).toContain('.dl(in0, FX_REV_COMB0_SAMPLES, fb)')
    expect(
      (WASM_FX_PLAY_CODE.match(/fxsecstosamples\(0\.029\)/g) ?? []).length,
    ).toBe(1)
  })

  it('fetches fx sends once and skips inactive stages in applyfxgroup', () => {
    expect(WASM_FX_PLAY_CODE).toContain('var s0 = fxsend(group, 0)')
    expect(WASM_FX_PLAY_CODE).toContain('var s6 = fxsend(group, 6)')
    expect(WASM_FX_PLAY_CODE).toContain('if (s0 > 0)')
    expect(WASM_FX_PLAY_CODE).toContain('if (s6 > 0 && !skipbiquad)')
    expect(WASM_FX_PLAY_CODE).toContain(
      'var skipbiquad = WASM_PERF_MODE && group >= 2',
    )
    expect(WASM_FX_PLAY_CODE).toContain('if (WASM_PERF_MODE) {')
    expect(WASM_FX_PLAY_CODE).not.toContain('function addfxserialwet')
  })
})
