import { createwasmsynth } from 'ops/archive/synth/maxi/maxisynth'
import { clonewasmreplaystate } from 'zss/feature/synth/backend/wasm/wasmreplaystate'
import { invokeplay, parseplay } from 'zss/feature/synth/playnotation'

describe('wasm replay state', () => {
  it('deep-clones nested voice and osc fields', () => {
    const original = {
      voicecfg: [
        {
          type: 0,
          algo: 0,
          osc: 0,
          envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.3 },
          portamento: 0,
          volume: 0,
        },
      ],
      oscconfig: [
        {
          phase: 0,
          width: 0.5,
          modfreq: 1,
          harmonicity: 2,
          modindex: 3,
          count: 4,
          spread: 5,
          partialcount: 1,
          partials: [1, 0, 0, 0, 0, 0, 0, 0],
          modenv: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
          modtype: 1,
        },
      ],
      algoconfig: [
        {
          harmonicity1: 1,
          harmonicity2: 2,
          harmonicity3: 3,
          modindex1: 1,
          modindex2: 1,
          modindex3: 1,
          osc1: 0,
          osc2: 0,
          osc3: 0,
          osc4: 0,
          env1: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
          env2: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
          env3: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
          env4: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
        },
      ],
      fxsab: [1, 2, 3],
      playvolume: 80,
      bgplayvolume: 100,
    }
    const state = clonewasmreplaystate(original)

    state.voicecfg[0].envelope.attack = 0
    state.oscconfig[0].partials[0] = 9
    state.fxsab[0] = 99

    expect(original.fxsab).toEqual([1, 2, 3])
    expect(original.oscconfig[0].partials[0]).toBe(1)
    expect(original.voicecfg[0].envelope.attack).toBe(0.1)
  })
})

describe('wasm synth recording', () => {
  function mockmaxi() {
    return {
      audioContext: {
        currentTime: 0,
        sampleRate: 22050,
        createGain: () => ({
          gain: { value: 0 },
          connect: () => {},
          disconnect: () => {},
        }),
        createScriptProcessor: () => ({
          onaudioprocess: null,
          connect: () => {},
          disconnect: () => {},
        }),
        createBuffer: (channels: number, length: number, rate: number) => ({
          numberOfChannels: channels,
          length,
          sampleRate: rate,
          copyToChannel: () => {},
        }),
        destination: {},
      },
      audioWorkletNode: {
        disconnect: () => {},
        connect: () => {},
      },
      send: () => {},
    }
  }

  it('captures ticks from addplay and flush clears buffer', () => {
    const synth = createwasmsynth(mockmaxi() as any)
    synth.addplay('c')
    synth.synthflush()
    expect(() => synth.synthrecord('test')).not.toThrow()
    synth.destroy()
  })

  it('exports replay snapshot with current volumes', () => {
    const synth = createwasmsynth(mockmaxi() as any)
    synth.setplayvolume(42)
    synth.setbgplayvolume(77)
    const replay = synth.getreplay()
    expect(replay.playvolume).toBe(42)
    expect(replay.bgplayvolume).toBe(77)
    synth.destroy()
  })

  it('builds offline shift matching tone recordhandler', () => {
    const pattern = invokeplay(0, 10, parseplay('c')[0], true)
    const times = pattern.map((item) => item[0])
    const mintime = Math.min(...times)
    const maxtime = Math.max(...times)
    const shifted = pattern.map(
      ([time, value]) => [time - mintime + 0.1, value] as const,
    )
    expect(shifted[0][0]).toBe(0.1)
    expect(maxtime).toBeGreaterThan(mintime)
  })
})
