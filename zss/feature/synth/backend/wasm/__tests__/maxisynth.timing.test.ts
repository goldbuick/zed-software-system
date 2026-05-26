import { invokeplay, parseplay, tonenotationseconds } from 'zss/feature/synth/playnotation'

import { createwasmsynth } from '../maxisynth'

describe('wasm play timing', () => {
  function mockmaxi() {
    let clock = 0
    const sends: Record<string, number[]> = {}
    const maxi = {
      audioContext: {
        get currentTime() {
          return clock
        },
      },
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
      advance(ms: number) {
        clock += ms / 1000
      },
    }
    return { maxi, sends, getclock: () => clock }
  }

  it('starts semicolon voices on the same beat', () => {
    jest.useFakeTimers()
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('c;e')
    jest.advanceTimersByTime(1)
    expect(sends.zss_voices?.[1]).toBe(1)
    expect(sends.zss_voices?.[7]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })

  it('staggers consecutive addplay by last pattern time, not extra 8n', () => {
    jest.useFakeTimers()
    const gateat: number[] = []
    let clock = 0
    const maxi = {
      audioContext: {
        get currentTime() {
          return clock
        },
      },
      send: () => {},
      audioWorkletNode: {
        port: {
          postMessage: (msg: {
            channelID?: string
            data?: number[]
          }) => {
            if (msg.channelID === 'zss_voices' && msg.data?.[1] === 1) {
              gateat.push(clock)
            }
          },
        },
      },
      advance(ms: number) {
        clock += ms / 1000
      },
    }
    const synth = createwasmsynth(maxi as any)
    const pattern1 = invokeplay(0, 0, parseplay('c')[0], true)
    const nextstart = pattern1[pattern1.length - 1]?.[0] ?? 0

    synth.addplay('c')
    synth.addplay('e')

    maxi.advance(1)
    jest.advanceTimersByTime(1)
    expect(gateat).toEqual([0])

    maxi.advance(Math.max(0, nextstart * 1000))
    jest.advanceTimersByTime(Math.max(0, nextstart * 1000))
    expect(gateat[0]).toBe(0)
    expect(gateat[1] ?? 0).toBeLessThan(nextstart + tonenotationseconds('8n') * 0.5)
    expect(Math.abs((gateat[1] ?? 0) - nextstart)).toBeLessThan(0.01)

    synth.destroy()
    jest.useRealTimers()
  })
})
