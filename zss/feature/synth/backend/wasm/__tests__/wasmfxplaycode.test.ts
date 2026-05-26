import { WASM_FX_PLAY_CODE } from '../wasmfxplaycode'
import { WASM_FX_GROUP_COUNT } from '../wasmfxstate'

describe('wasm fx play code', () => {
  it('declares per-bus fx state as arrays indexed by group', () => {
    expect(WASM_FX_PLAY_CODE).toContain('var fxechofb = [')
    expect(WASM_FX_PLAY_CODE).not.toContain('var fxechofb0 =')
    expect(WASM_FX_PLAY_CODE).toMatch(
      new RegExp(`var fxechodelay = \\[(?:new Maximilian\\.maxiDelayline\\(\\), ){${WASM_FX_GROUP_COUNT - 1}}new Maximilian\\.maxiDelayline\\(\\)\\];`),
    )
  })

  it('uses group indexing for echo feedback state', () => {
    expect(WASM_FX_PLAY_CODE).toContain('fxechofb[group]')
    expect(WASM_FX_PLAY_CODE).toContain('fxechodelay[group].dl')
  })
})
