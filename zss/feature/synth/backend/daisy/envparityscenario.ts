import { tonenotationseconds } from '../../playnotation'

import type { LEVEL_STABILITY_SCENARIO } from './levelstabilitytypes.ts'
import {
  paritydurationwithrelease,
  releasesecfromvoiceconfigs,
} from './parityduration.ts'

export const ENV_PARITY_SCENARIO_ID = 'env-parity-amsaw'

const ENV_PARITY_GATE_SEC = tonenotationseconds('2n')

/** User repro env on amsaw — half-note sustain for Tone vs Daisy comparison. */
export const ENV_PARITY_VOICE_CONFIGS: LEVEL_STABILITY_SCENARIO['voiceconfigs'] =
  [
    ['amsawtooth', ''],
    ['modenv', [0.03, 0.2, 0.03, 0.1]],
    ['env', [0.03, 0.2, 0.03, 0.1]],
  ]

export function envparityscenario(): LEVEL_STABILITY_SCENARIO {
  const release = releasesecfromvoiceconfigs(ENV_PARITY_VOICE_CONFIGS)
  return {
    id: ENV_PARITY_SCENARIO_ID,
    description:
      'amsaw + env 0.03/0.2/0.03/0.1 half note (Tone parity fixture)',
    notation: '+hc',
    durationsec: paritydurationwithrelease(ENV_PARITY_GATE_SEC, release, 1.5),
    voiceconfigs: ENV_PARITY_VOICE_CONFIGS,
  }
}

/** Repeated 8th notes — exercises note-on envelope retrigger. */
export function envparityretriggerscenario(): LEVEL_STABILITY_SCENARIO {
  const release = releasesecfromvoiceconfigs(ENV_PARITY_VOICE_CONFIGS)
  return {
    id: 'env-parity-amsaw-8n',
    description: 'amsaw + env 0.03/0.2/0.03/0.1 repeated 8th notes',
    notation: '+icdeg',
    durationsec: paritydurationwithrelease(
      ENV_PARITY_GATE_SEC * 4,
      release,
      1.5,
    ),
    voiceconfigs: ENV_PARITY_VOICE_CONFIGS,
  }
}

export const ENV_PARITY_SCENARIOS = [
  envparityscenario(),
  envparityretriggerscenario(),
]
