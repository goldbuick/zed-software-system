import type { SYNTH_NOTE_ENTRY } from '../../playnotation'

export type LEVEL_STABILITY_FX = {
  fx: string
  config: string | number
  value?: string | number
  group?: number
}

export type LEVEL_STABILITY_VOICE_CONFIG = [
  string,
  string | number | number[],
]

export type LEVEL_STABILITY_SCENARIO = {
  id: string
  description: string
  notation?: string
  ticks?: SYNTH_NOTE_ENTRY[]
  playsequence?: string[]
  durationsec?: number
  voiceconfig?: string
  voiceconfigs?: LEVEL_STABILITY_VOICE_CONFIG[]
  fx?: LEVEL_STABILITY_FX[]
}
