import { duckwasmsidechain, setwasmplayvolume, wirewasmmasterchain } from '../wasmmasterchain'

function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}

describe('wasmmasterchain', () => {
  it('maps play volume through main volume gain', () => {
    const ctx = {
      destination: {
        channelInterpretation: '',
        channelCountMode: '',
      },
      createGain: () => ({
        gain: { value: 0, cancelScheduledValues: () => {}, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => {},
        disconnect: () => {},
        channelCount: 0,
        channelCountMode: '',
        channelInterpretation: '',
      }),
      createDynamicsCompressor: () => ({
        threshold: { value: 0 },
        ratio: { value: 0 },
        attack: { value: 0 },
        release: { value: 0 },
        knee: { value: 0 },
        connect: () => {},
      }),
    }
    const worklet = {
      disconnect: () => {},
      connect: () => {},
      channelCount: 0,
      channelCountMode: '',
      channelInterpretation: '',
    }
    const chain = wirewasmmasterchain(ctx as any, worklet as any)
    setwasmplayvolume(chain, 80)
    const expected = Math.pow(10, (volumetodb(80 * 0.25) - 3) / 20)
    expect(chain.mainvolume.gain.value).toBeCloseTo(expected, 4)
  })

  it('uses stronger duck for clap than bass', () => {
    const ramps: number[] = []
    const gain = {
      value: 1,
      cancelScheduledValues: () => {},
      setValueAtTime: () => {},
      linearRampToValueAtTime: (v: number) => {
        ramps.push(v)
      },
    }
    const chain = {
      voicegain: { gain },
      mainvolume: { gain: { value: 1 } },
      compressor: {},
    }
    duckwasmsidechain(chain as any, { currentTime: 0 } as any, 3)
    const clapfloor = ramps[0]
    ramps.length = 0
    duckwasmsidechain(chain as any, { currentTime: 0 } as any, 9)
    const bassfloor = ramps[0]
    expect(clapfloor).toBeLessThan(bassfloor)
  })
})
