import type { SYNTH_STATE } from 'zss/gadget/data/types'

export type FXNAME =
  | 'fc'
  | 'fcrush'
  | 'echo'
  | 'reverb'
  | 'autofilter'
  | 'vibrato'
  | 'distortion'
  | 'distort'
  | 'autowah'

export type SynthBackend = {
  addplay(buffer: string): void
  addbgplay(buffer: string, quantize: string): void
  stopplay(): void
  setplayvolume(volume: number): void
  setbgplayvolume(volume: number): void
  setttsvolume(volume: number): void
  setvoiceconfig(index: number, config: string | number, value: unknown): void
  applyvoicefx(
    index: number,
    fx: string,
    config: string | number,
    value: unknown,
  ): void
  replayvoicefx(voicefx: SYNTH_STATE['voicefx']): void
  synthrecord(filename: string): void
  synthflush(): void
  playaudiobuffer(buffer: AudioBuffer): void
  broadcastdestination(): MediaStreamAudioDestinationNode | undefined
  warmdrums?(): void
  destroy(): void
}
