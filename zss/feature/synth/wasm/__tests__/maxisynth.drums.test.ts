import { createwasmsynth } from '../maxisynth'

describe('wasm drum scheduling', () => {
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

  it('increments drum strike counters for digit notes', () => {
    jest.useFakeTimers()
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('0')
    expect(sends.zss_drums?.[0]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })

  it('ducks sidechain on clap and bass hits', () => {
    jest.useFakeTimers()
    const duck = jest.fn()
    const { maxi } = mockmaxi()
    const synth = createwasmsynth(maxi as any, { ducksidechain: duck })
    synth.addplay('p')
    expect(duck).toHaveBeenCalledWith(3)
    synth.stopplay()
    duck.mockClear()
    synth.addplay('9')
    expect(duck).toHaveBeenCalledWith(9)
    duck.mockClear()
    synth.addplay('0')
    expect(duck).not.toHaveBeenCalled()
    synth.destroy()
    jest.useRealTimers()
  })

  it('warmdrums increments all drum strike counters', () => {
    const { maxi, sends } = mockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.warmdrums()
    expect(sends.zss_drums).toHaveLength(10)
    for (let i = 0; i < 10; i++) {
      expect(sends.zss_drums?.[i]).toBe(1)
    }
    synth.destroy()
  })
})
