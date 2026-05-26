import { tonenotationseconds } from 'zss/feature/synth/playnotation'

import { createwasmsynth } from '../maxisynth'

describe('wasm drum scheduling', () => {
  function mockmaxi() {
    const sends: Record<string, number[]> = {}
    const maxi = {
      audioContext: { currentTime: 0 },
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

  it('increments drum strike counters for digit notes', () => {
    jest.useFakeTimers()
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('0')
    expect(sends.zss_drums?.[0]).toBe(1)
    expect(sends.zss_drums).toHaveLength(20)
    expect(sends.zss_drums?.[10]).toBeCloseTo(tonenotationseconds('16n'), 4)
    synth.destroy()
    jest.useRealTimers()
  })

  it('warmdrums increments all drum strike counters', () => {
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.warmdrums()
    expect(sends.zss_drums).toHaveLength(20)
    for (let i = 0; i < 10; i++) {
      expect(sends.zss_drums?.[i]).toBe(1)
    }
    synth.destroy()
  })

  it('passes pattern note duration for cowbell hits', () => {
    jest.useFakeTimers()
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('2')
    expect(sends.zss_drums?.[2]).toBe(1)
    expect(sends.zss_drums?.[12]).toBeGreaterThan(0)
    synth.destroy()
    jest.useRealTimers()
  })
})
