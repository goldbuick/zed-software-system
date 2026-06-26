import type {
  LEVEL_STABILITY_SCENARIO,
  LEVEL_STABILITY_VOICE_CONFIG,
} from 'zss/feature/synth/backend/daisy/levelstabilitytypes'
import { tonenotationseconds } from 'zss/feature/synth/playnotation'

import { paritydurationwithrelease } from './parityduration.ts'

/** User-reported repro + long-release matrix (seconds). */
export const SYNTH_ENV_PARITY_ADSR = [0.05, 0.1, 0.1, 10] as const

export const SYNTH_ENV_PARITY_PORT = 0.01

/** Tone FM default modulation envelope (carrier env tested separately). */
export const SYNTH_ENV_TONE_MODENV = [0.005, 0.1, 1, 0.5] as const

const HALF_NOTE_SEC = tonenotationseconds('2n')

const LONG_DURATION_SEC = paritydurationwithrelease(
  HALF_NOTE_SEC,
  SYNTH_ENV_PARITY_ADSR[3],
  1.5,
)

const BASE_ENV_CONFIGS: LEVEL_STABILITY_VOICE_CONFIG[] = [
  ['env', [...SYNTH_ENV_PARITY_ADSR]],
  ['port', SYNTH_ENV_PARITY_PORT],
]

export function buildsynthenvparityscenario(
  id: string,
  description: string,
  wave: string,
  notation: string,
  extra?: LEVEL_STABILITY_VOICE_CONFIG[],
): LEVEL_STABILITY_SCENARIO {
  const voiceconfigs: LEVEL_STABILITY_VOICE_CONFIG[] = [
    [wave, ''],
    ...(extra ?? []),
    ...BASE_ENV_CONFIGS,
  ]
  return {
    id,
    description,
    notation,
    durationsec: LONG_DURATION_SEC,
    voiceconfigs,
  }
}

export function synthenvsquaresustain(): LEVEL_STABILITY_SCENARIO {
  return buildsynthenvparityscenario(
    'synth-env-square-long',
    'square + env 0.05/0.1/0.1/10 half note (carrier env only)',
    'square',
    '+hc',
  )
}

export function synthenvamsawsustain(): LEVEL_STABILITY_SCENARIO {
  return buildsynthenvparityscenario(
    'synth-env-amsaw-long',
    'amsaw + env 0.05/0.1/0.1/10 half note',
    'amsawtooth',
    '+hc',
  )
}

export function synthenvfmsquarerepro(): LEVEL_STABILITY_SCENARIO {
  return buildsynthenvparityscenario(
    'synth-env-fmsquare-repro',
    'fmsquare + modtype sawtooth + env 0.05/0.1/0.1/10 + port 0.01 (user repro)',
    'fmsquare',
    '+hc',
    [['modtype', 'sawtooth']],
  )
}

export function synthenvfmsquaremodenvpinned(): LEVEL_STABILITY_SCENARIO {
  return buildsynthenvparityscenario(
    'synth-env-fmsquare-modenv-pinned',
    'fmsquare repro + Tone-like modenv (isolate carrier env)',
    'fmsquare',
    '+hc',
    [
      ['modtype', 'sawtooth'],
      ['modenv', [...SYNTH_ENV_TONE_MODENV]],
    ],
  )
}

export function synthenvsquareretrigger(): LEVEL_STABILITY_SCENARIO {
  return buildsynthenvparityscenario(
    'synth-env-square-retrigger',
    'square + long env, repeated 8th notes',
    'square',
    '+icdeg',
  )
}

export function synthenvfmsquareretrigger(): LEVEL_STABILITY_SCENARIO {
  return buildsynthenvparityscenario(
    'synth-env-fmsquare-repro-retrigger',
    'fmsquare repro + long env, repeated 8th notes',
    'fmsquare',
    '+icdeg',
    [['modtype', 'sawtooth']],
  )
}

export const SYNTH_ENV_PARITY_SCENARIOS: LEVEL_STABILITY_SCENARIO[] = [
  synthenvsquaresustain(),
  synthenvamsawsustain(),
  synthenvfmsquarerepro(),
  synthenvfmsquaremodenvpinned(),
  synthenvsquareretrigger(),
  synthenvfmsquareretrigger(),
]

/** CI must pass (wave-agnostic carrier env). */
export const SYNTH_ENV_PARITY_REQUIRED_IDS = new Set([
  'synth-env-square-long',
  'synth-env-fmsquare-repro',
])

export const SYNTH_ENV_RETRIGGER_IDS = new Set([
  'synth-env-square-retrigger',
  'synth-env-fmsquare-repro-retrigger',
])

export const SYNTH_ENV_PARITY_GATE_SEC = HALF_NOTE_SEC
