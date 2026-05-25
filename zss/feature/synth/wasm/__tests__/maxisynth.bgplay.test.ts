import { createwasmsynth } from '../maxisynth'

describe('wasm bgplay volume', () => {
  function mockmaxi() {
    const sends: Record<string, number[]> = {}
    const maxi = {
      audioContext: { currentTime: 0 },
      send: () => {},
      audioWorkletNode: {
        port: {
          postMessage: (msg: {
            channelID?: string
            data?: number[]
          }) => {
            if (msg.channelID && msg.data) {
              sends[msg.channelID] = msg.data.slice()
            }
          },
        },
      },
    }
    return { maxi, sends }
  }

  it('calls bgplay volume hook', () => {
    const { maxi } = mockmaxi()
    let pushed = -1
    const synth = createwasmsynth(maxi as any, {
      setbgplayvolume: (volume) => {
        pushed = volume
      },
    })
    synth.setbgplayvolume(50)
    expect(synth.getbgplayvolume()).toBe(50)
    expect(pushed).toBe(50)
    synth.destroy()
  })

  it('schedules bgplay on channel 4', () => {
    jest.useFakeTimers()
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addbgplay('c', '+0.05')
    jest.advanceTimersByTime(50)
    expect(sends.zss_voices?.[24]).toBeGreaterThan(0)
    expect(sends.zss_voices?.[25]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })

  it('schedules main play on channel 0', () => {
    jest.useFakeTimers()
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('c')
    jest.advanceTimersByTime(1)
    expect(sends.zss_voices?.[0]).toBeGreaterThan(0)
    expect(sends.zss_voices?.[1]).toBe(1)
    expect(sends.zss_voices?.[24]).toBe(0)
    synth.destroy()
    jest.useRealTimers()
  })

  it('keeps play and bgplay on separate channels', () => {
    jest.useFakeTimers()
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('c')
    synth.addbgplay('e', '+0.05')
    jest.advanceTimersByTime(50)
    expect(sends.zss_voices?.[1]).toBe(1)
    expect(sends.zss_voices?.[25]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })
})
