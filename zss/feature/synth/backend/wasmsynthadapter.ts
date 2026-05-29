import type { SynthBackend } from '../frontend/synthbackend'

import {
  getwasmbroadcastdestination,
  playwasmaudiobuffer,
  setwasmsynthttsvolume,
} from './wasm/maximilian'
import type { WASM_SYNTH } from './wasm/maxisynth'

export function createwasmsynthadapter(synth: WASM_SYNTH): SynthBackend {
  return {
    addplay: (buffer) => synth.addplay(buffer),
    addbgplay: (buffer, quantize) => synth.addbgplay(buffer, quantize),
    stopplay: () => synth.stopplay(),
    setplayvolume: (volume) => synth.setplayvolume(volume),
    setbgplayvolume: (volume) => synth.setbgplayvolume(volume),
    setttsvolume: (volume) => {
      synth.setttsvolume(volume)
      setwasmsynthttsvolume(volume)
    },
    setvoiceconfig: (index, config, value) =>
      synth.setvoiceconfig(index, config, value as string | number | number[]),
    applyvoicefx: (index, fx, config, value) =>
      synth.applyvoicefx(index, fx, config, value as string | number),
    replayvoicefx: (voicefx) => synth.replayvoicefx(voicefx),
    synthrecord: (filename) => synth.synthrecord(filename),
    synthflush: () => synth.synthflush(),
    playaudiobuffer: (buffer) => playwasmaudiobuffer(buffer),
    broadcastdestination: () => getwasmbroadcastdestination(),
    warmdrums: () => synth.warmdrums(),
    destroy: () => synth.destroy(),
  }
}
