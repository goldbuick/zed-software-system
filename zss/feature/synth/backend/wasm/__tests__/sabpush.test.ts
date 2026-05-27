import { createwasmsynth } from '../maxisynth'
import {
  resetwasmsabregistry,
  setwasmsabwritehook,
  wasmsabsnapshot,
} from '../sabpush'
import { sabseqsnapshot } from '../sabseq'
import { createmockmaxi } from '../testhelpers/mockmaxi'
import { WASM_DRUMS_SAB, WASM_SAB_SEQ_IDX, WASM_VOICES_SAB } from '../wasmsabchannels'

describe('sabpush zero-copy', () => {
  afterEach(() => {
    resetwasmsabregistry()
  })

  it('registers shared buffers once and reuses views on push', () => {
    const messages: unknown[] = []
    const { maxi } = createmockmaxi()
    const port = maxi.audioWorkletNode.port as {
      postMessage: (msg: unknown) => void
    }
    port.postMessage = (msg: unknown) => {
      messages.push(msg)
    }
    const synth = createwasmsynth(maxi as any)
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
    const { maxi, snapshot } = createmockmaxi()
    const seen: string[] = []
    setwasmsabwritehook((channelid) => {
      seen.push(channelid)
    })
    const synth = createwasmsynth(maxi as any)
    synth.addplay('0')
    expect(seen).toContain(WASM_DRUMS_SAB)
    expect(snapshot(WASM_DRUMS_SAB)[0]).toBe(1)
    synth.destroy()
  })

  it('bumps voices seq on play without osc cfg seq change', () => {
    const { maxi } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
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
    const { maxi } = createmockmaxi()
    const port = maxi.audioWorkletNode.port as {
      postMessage: (msg: unknown) => void
    }
    port.postMessage = (msg: unknown) => {
      messages.push(msg)
    }
    const synth = createwasmsynth(maxi as any)
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
