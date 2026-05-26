import { createwasmsynth } from '../maxisynth'
import {
  resetwasmsabregistry,
  setwasmsabwritehook,
  wasmsabsnapshot,
} from '../sabpush'
import { createmockmaxi } from '../testhelpers/mockmaxi'
import { WASM_DRUMS_SAB, WASM_VOICES_SAB } from '../wasmsabchannels'

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
})
