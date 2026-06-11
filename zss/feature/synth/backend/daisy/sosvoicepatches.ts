/** Offline render patches for SOS instrument voices (Daisy WASM-only). */
export type SOS_VOICE_PATCH = {
  id: string
  voiceconfig: string
  /** Extra `#synth` configs applied after voice type selection. */
  configs?: [string, number | string][]
  notation: string
  durationsec: number
}

export const SOS_VOICE_PATCHES: SOS_VOICE_PATCH[] = [
  {
    id: 'sos-flute-c4',
    voiceconfig: 'flute',
    notation: '2C4',
    durationsec: 1.5,
  },
  {
    id: 'sos-clarinet-c4',
    voiceconfig: 'clarinet',
    notation: '2C4',
    durationsec: 1.5,
  },
  {
    id: 'sos-brass-c4',
    voiceconfig: 'brass',
    notation: '2C4',
    durationsec: 1.5,
  },
  {
    id: 'sos-panpipe-c4',
    voiceconfig: 'panpipe',
    notation: '2C4',
    durationsec: 1.5,
  },
  {
    id: 'sos-piano-c3',
    voiceconfig: 'piano',
    notation: 'qC3',
    durationsec: 1.0,
  },
  {
    id: 'sos-epiano-c4',
    voiceconfig: 'epiano',
    notation: 'qC4',
    durationsec: 1.0,
  },
  {
    id: 'sos-violin-g4',
    voiceconfig: 'violin',
    configs: [['port', 0.08]],
    notation: '2G4',
    durationsec: 2.0,
  },
  {
    id: 'sos-viola-c4',
    voiceconfig: 'viola',
    notation: '2C4',
    durationsec: 2.0,
  },
  {
    id: 'sos-tonewheel-c3',
    voiceconfig: 'tonewheel',
    notation: '2C3',
    durationsec: 1.5,
  },
  {
    id: 'sos-drawbar-c3',
    voiceconfig: 'drawbar',
    configs: [['drawbar', 0.85]],
    notation: '2C3',
    durationsec: 1.5,
  },
  {
    id: 'sos-timpani-c2',
    voiceconfig: 'timpani',
    notation: 'qC2',
    durationsec: 1.5,
  },
  {
    id: 'sos-string-c4',
    voiceconfig: 'string',
    configs: [
      ['detune', 0.3],
      ['pwm', 0.25],
      ['filter', 0.55],
    ],
    notation: '2C4',
    durationsec: 2.0,
  },
]
