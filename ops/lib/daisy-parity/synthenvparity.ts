import { analyzelevelstability } from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'

import { envparitytimelinesmatchsamples } from './envparityrender.ts'
import {
  type SYNTH_ENV_PARITY_RESULT,
  buildsynthenvcheckpoints,
  sustainsmediandb,
} from './synthenvparitygate.ts'
import {
  SYNTH_ENV_PARITY_ADSR,
  SYNTH_ENV_PARITY_GATE_SEC,
  SYNTH_ENV_RETRIGGER_IDS,
} from './synthenvparityscenario.ts'

export {
  SYNTH_ENV_SUSTAIN_TOL_DB,
  SYNTH_ENV_RELEASE_TOL_DB,
  SYNTH_ENV_RELEASE_CHECKPOINTS_SEC,
  evalsynthenvparitygate,
  formatsynthenvparityreport,
  sustainsmediandb,
  buildsynthenvcheckpoints,
} from './synthenvparitygate.ts'

export type {
  SYNTH_ENV_CHECKPOINT_METRICS,
  SYNTH_ENV_PARITY_METRICS,
  SYNTH_ENV_PARITY_RESULT,
  SYNTH_ENV_PARITY_GATE_RESULT,
} from './synthenvparitygate.ts'

export function analyzesynthenvparity(
  id: string,
  daisysamples: Float32Array,
  daisysamplerate: number,
  tonemono: Float32Array,
  tonesamplerate: number,
  gatesec = SYNTH_ENV_PARITY_GATE_SEC,
  releasesec = SYNTH_ENV_PARITY_ADSR[3],
  rendersec: number,
  windowms = 46,
): SYNTH_ENV_PARITY_RESULT {
  const daisy = analyzelevelstability(daisysamples, daisysamplerate, windowms)
  const tone = analyzelevelstability(tonemono, tonesamplerate, windowms)

  const attacksec = SYNTH_ENV_PARITY_ADSR[0]
  const decaysec = SYNTH_ENV_PARITY_ADSR[1]

  const checkpoints = buildsynthenvcheckpoints(
    daisysamples,
    daisysamplerate,
    tonemono,
    tonesamplerate,
    gatesec,
    rendersec,
    windowms,
  )

  let timelinesmatch: boolean | undefined
  if (SYNTH_ENV_RETRIGGER_IDS.has(id)) {
    timelinesmatch = envparitytimelinesmatchsamples(
      daisysamples,
      daisysamplerate,
      tonemono,
      tonesamplerate,
      rendersec,
      windowms,
    )
  }

  return {
    metrics: {
      id,
      gatesec,
      releasesec,
      sustainmediandb: {
        daisy: sustainsmediandb(
          daisysamples,
          daisysamplerate,
          gatesec,
          attacksec,
          decaysec,
          windowms,
        ),
        tone: sustainsmediandb(
          tonemono,
          tonesamplerate,
          gatesec,
          attacksec,
          decaysec,
          windowms,
        ),
      },
      checkpoints,
      timelinesmatch,
    },
    daisy,
    tone,
  }
}
