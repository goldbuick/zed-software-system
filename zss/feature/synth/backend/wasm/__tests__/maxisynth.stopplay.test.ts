import { createwasmsynth } from '../maxisynth'
import { WASM_FX_SEND_COUNT, WASM_FX_SEND_IDX } from '../wasmfxstate'

describe('wasm stopplay', () => {
  function mockmaxi() {
    const sends: Record<string, number[]> = {}
    const maxi = {
      audioContext: {
        currentTime: 0,
      },
      send: () => {},
      audioWorkletNode: {
        port: {
          postMessage: (msg: { channelID?: string; data?: number[] }) => {
            if (msg.channelID && msg.data) {
              sends[msg.channelID] = msg.data.slice()
            }
          },
        },
      },
    }
    return { maxi, sends }
  }

  it('stopplay gates off play voices in zss_voices sab', () => {
    jest.useFakeTimers()
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('c')
    jest.advanceTimersByTime(1)
    expect(sends.zss_voices?.[1]).toBe(1)

    synth.stopplay()

    expect(sends.zss_voices?.[1]).toBe(0)
    expect(sends.zss_voices?.[7]).toBe(0)
    expect(sends.zss_voices?.[13]).toBe(0)
    expect(sends.zss_voices?.[19]).toBe(0)
    synth.destroy()
    jest.useRealTimers()
  })

  it('restart clears fx sends after echo was enabled', () => {
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.applyvoicefx(0, 'echo', 'on', '')
    expect(sends.zss_fx?.[WASM_FX_SEND_IDX.ECHO]).toBeGreaterThan(0)

    synth.setvoiceconfig(0, 'restart', '')

    expect(sends.zss_fx?.[WASM_FX_SEND_IDX.ECHO]).toBe(0)
    expect(sends.zss_fx?.[WASM_FX_SEND_COUNT + WASM_FX_SEND_IDX.ECHO]).toBe(0)
    synth.destroy()
  })

  it('replayvoicefx with empty map resets fx sab to defaults', () => {
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.applyvoicefx(0, 'echo', 'on', '')
    expect(sends.zss_fx?.[WASM_FX_SEND_IDX.ECHO]).toBeGreaterThan(0)

    synth.replayvoicefx({})

    expect(sends.zss_fx?.[WASM_FX_SEND_IDX.ECHO]).toBe(0)
    synth.destroy()
  })
})
