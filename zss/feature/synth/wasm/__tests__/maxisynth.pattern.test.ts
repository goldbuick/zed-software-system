import { invokeplay, parseplay } from 'zss/feature/synth/playnotation'

import { createwasmsynth } from '../maxisynth'

describe('wasm drum pattern', () => {
  it('schedules all ten drums from 0x1x2xpx4x5x6x7x8x9x', () => {
    jest.useFakeTimers()
    const sends: Record<string, number[][]> = {}
    const maxi = {
      audioContext: { currentTime: 0 },
      send: () => {},
      audioWorkletNode: {
        port: {
          postMessage: (msg: { channelID?: string; data?: number[] }) => {
            if (msg.channelID && msg.data) {
              sends[msg.channelID] ??= []
              sends[msg.channelID].push(msg.data.slice())
            }
          },
        },
      },
    }
    const synth = createwasmsynth(maxi as any)
    const invoke = parseplay('0x1x2xpx4x5x6x7x8x9x')[0]
    const pattern = invokeplay(0, 0, invoke, true)
    const drums = pattern
      .filter(([, value]) => typeof value[2] === 'number' && value[2] >= 0 && value[2] <= 9)
      .map(([time, value]) => [time, value[2]] as const)

    expect(drums.map(([, id]) => id).sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

    synth.addplay('0x1x2xpx4x5x6x7x8x9x')
    jest.advanceTimersByTime(5000)

    const pushes = sends.zss_drums ?? []
    const peak = new Array(10).fill(0)
    for (const row of pushes) {
      for (let i = 0; i < 10; i++) {
        peak[i] = Math.max(peak[i], row[i] ?? 0)
      }
    }
    expect(peak).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
    synth.destroy()
    jest.useRealTimers()
  })
})
