import type { SynthBackend } from '../../frontend/synthbackend'

import {
  getdaisybroadcastdestination,
  playdaisyaudiobuffer,
  setdaisysynthttsvolume,
} from './daisyengine'
import type { DAISY_SYNTH } from './daisysynth'

export function createdaisysynthadapter(synth: DAISY_SYNTH): SynthBackend {
  return {
    addplay: (buffer) => synth.addplay(buffer),
    addbgplay: (buffer, quantize) => synth.addbgplay(buffer, quantize),
    stopplay: () => synth.stopplay(),
    setplayvolume: (volume) => synth.setplayvolume(volume),
    setbgplayvolume: (volume) => synth.setbgplayvolume(volume),
    setttsvolume: (volume) => {
      synth.setttsvolume(volume)
      setdaisysynthttsvolume(volume)
    },
    setvoiceconfig: (index, config, value) =>
      synth.setvoiceconfig(index, config, value as string | number | number[]),
    applyvoicefx: (index, fx, config, value) =>
      synth.applyvoicefx(index, fx, config, value as string | number),
    replayvoicefx: (voicefx) => synth.replayvoicefx(voicefx),
    synthrecord: (filename) => synth.synthrecord(filename),
    synthflush: () => synth.synthflush(),
    playaudiobuffer: (buffer) => playdaisyaudiobuffer(buffer),
    broadcastdestination: () => getdaisybroadcastdestination(),
    warmdrums: () => synth.warmdrums(),
    destroy: () => synth.destroy(),
  }
}
