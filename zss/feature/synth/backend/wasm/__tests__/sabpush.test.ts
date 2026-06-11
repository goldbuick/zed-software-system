import {
  resetwasmsabregistry,
  setwasmsabwritehook,
  wasmsabsnapshot,
} from 'zss/feature/synth/backend/wasm/sabpush'
import { sabseqsnapshot } from 'zss/feature/synth/backend/wasm/sabseq'
import { createminsabsynth } from 'zss/feature/synth/backend/wasm/testhelpers/minsabsynth'
import { createmocksabengine } from 'zss/feature/synth/backend/wasm/testhelpers/mocksab'
import {
  WASM_DRUMS_SAB,
  WASM_SAB_SEQ_IDX,
  WASM_VOICES_SAB,
} from 'zss/feature/synth/backend/wasm/wasmsabchannels'

describe('sabpush zero-copy', () => {
  afterEach(() => {
    resetwasmsabregistry()
  })

  it('registers shared buffers once and reuses views on push', () => {
    const messages: unknown[] = []
    const { engine } = createmocksabengine()
    const port = engine.audioWorkletNode.port as {
      postMessage: (msg: unknown) => void
    }
    port.postMessage = (msg: unknown) => {
      messages.push(msg)
    }
    const synth = createminsabsynth(engine)
    synth.addplay('c')
    const registers = messages.filter(
      (msg) =>
        typeof msg === 'object' &&
        msg !== null &&
        (msg as { zss_sab_register?: number }).zss_sab_register === 1,
    )
    expect(registers.length).toBeGreaterThan(0)
    expect(
      messages.some(
        (msg) =>
          typeof msg === 'object' &&
          msg !== null &&
          (msg as { zss_sab_push?: number }).zss_sab_push === 1,
      ),
    ).toBe(false)
    const voices = wasmsabsnapshot(WASM_VOICES_SAB)
    expect(voices[1]).toBe(1)
    synth.destroy()
  })

  it('exposes write hook for tests without postMessage payloads', () => {
    const { engine, snapshot } = createmocksabengine()
    const seen: string[] = []
    setwasmsabwritehook((channelid) => {
      seen.push(channelid)
    })
    const synth = createminsabsynth(engine)
    synth.addplay('0')
    expect(seen).toContain(WASM_DRUMS_SAB)
    expect(snapshot(WASM_DRUMS_SAB)[0]).toBe(1)
    synth.destroy()
  })

  it('schedules crash and ride drum strikes from k and r', () => {
    jest.useFakeTimers()
    const { engine, snapshot } = createmocksabengine()
    const engineclock = engine as typeof engine & { advance(ms: number): void }
    const synth = createminsabsynth(engine)
    synth.addplay('kr')
    for (let step = 0; step < 20; step++) {
      engineclock.advance(100)
      jest.advanceTimersByTime(100)
    }
    const drums = snapshot(WASM_DRUMS_SAB)
    expect(drums[10]).toBe(1)
    expect(drums[11]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })

  it('bumps voices seq on play without osc cfg seq change', () => {
    const { engine } = createmocksabengine()
    const synth = createminsabsynth(engine)
    synth.addplay('c')
    const seq = sabseqsnapshot()
    expect(seq[WASM_SAB_SEQ_IDX.VOICES]).toBeGreaterThan(0)
    const voicesbefore = seq[WASM_SAB_SEQ_IDX.VOICES]
    const oscbefore = seq[WASM_SAB_SEQ_IDX.OSC_CFG]
    synth.setvoiceconfig(0, 'width', 0.25)
    const seqafter = sabseqsnapshot()
    expect(seqafter[WASM_SAB_SEQ_IDX.OSC_CFG]).toBeGreaterThan(oscbefore)
    expect(seqafter[WASM_SAB_SEQ_IDX.VOICES]).toBe(voicesbefore)
    synth.destroy()
  })

  it('registers zss_sab_seq as int32 channel', () => {
    const messages: unknown[] = []
    const { engine } = createmocksabengine()
    const port = engine.audioWorkletNode.port as {
      postMessage: (msg: unknown) => void
    }
    port.postMessage = (msg: unknown) => {
      messages.push(msg)
    }
    const synth = createminsabsynth(engine)
    const seqregister = messages.find(
      (msg) =>
        typeof msg === 'object' &&
        msg !== null &&
        (msg as { zss_sab_register?: number }).zss_sab_register === 1 &&
        (msg as { channelID?: string }).channelID === 'zss_sab_seq',
    )
    expect(seqregister).toBeTruthy()
    expect((seqregister as { sabkind?: string }).sabkind).toBe('int32')
    synth.destroy()
  })
})
