import { createwasmsynth } from '../maxisynth'
import { createmockmaxi } from '../testhelpers/mockmaxi'
import { WASM_FX_SEND_COUNT, WASM_FX_SEND_IDX } from '../../../backend/wasm/wasmfxstate'

describe('wasm stopplay', () => {
  it('stopplay gates off play voices in zss_voices sab', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('c')
    jest.advanceTimersByTime(1)
    expect(snapshot('zss_voices')[1]).toBe(1)

    synth.stopplay()

    const voices = snapshot('zss_voices')
    expect(voices[1]).toBe(0)
    expect(voices[7]).toBe(0)
    expect(voices[13]).toBe(0)
    expect(voices[19]).toBe(0)
    synth.destroy()
    jest.useRealTimers()
  })

  it('restart clears fx sends after echo was enabled', () => {
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.applyvoicefx(0, 'echo', 'on', '')
    expect(snapshot('zss_fx')[WASM_FX_SEND_IDX.ECHO]).toBeGreaterThan(0)

    synth.setvoiceconfig(0, 'restart', '')

    const fx = snapshot('zss_fx')
    expect(fx[WASM_FX_SEND_IDX.ECHO]).toBe(0)
    expect(fx[WASM_FX_SEND_COUNT + WASM_FX_SEND_IDX.ECHO]).toBe(0)
    synth.destroy()
  })

  it('replayvoicefx with empty map resets fx sab to defaults', () => {
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.applyvoicefx(0, 'echo', 'on', '')
    expect(snapshot('zss_fx')[WASM_FX_SEND_IDX.ECHO]).toBeGreaterThan(0)

    synth.replayvoicefx({})

    expect(snapshot('zss_fx')[WASM_FX_SEND_IDX.ECHO]).toBe(0)
    synth.destroy()
  })
})
