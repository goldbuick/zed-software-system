import { SOURCE_TYPE } from 'zss/feature/synth/shared/sourcetype'
import { SYNTH_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'

import type { SabEngine } from '../shared/sabengine'

import { pushwasmsabvalues } from './sabpush'
import type { WASM_VOICE_STATE } from './wasmvoiceconfig'

export const WASM_VOICE_CFG_SAB = 'zss_voicecfg'
/** Must match DAISY_VOICE_CFG_STRIDE / kVoiceCfgStride in zss_daisy_synth.cpp. */
export const WASM_VOICE_CFG_STRIDE = 10
export const WASM_VOICE_CFG_BLOCK = SYNTH_VOICE_COUNT * WASM_VOICE_CFG_STRIDE

/** Tone ZSS reset SYNTH envelope — matches zssenv(10, 10, 0.5, 10) in voiceplaycode. */
export const DEFAULT_WASM_ENVELOPE = {
  attack: 0.01,
  decay: 0.01,
  sustain: 0.5,
  release: 0.01,
} as const

export const DEFAULT_WASM_VOICE_VOLUME_DB = 0

export const DEFAULT_WASM_PLUCK = {
  structure: 0.14,
  brightness: 0.22,
  damping: 0.68,
  accent: 0.48,
} as const

/** SOS string-machine defaults (SAB slots 6–9 when STRING_VOICE algo 0). */
export const DEFAULT_WASM_STRING_ENSEMBLE = {
  detune: 0.25,
  pwm: 0.2,
  vib: 0.35,
  filter: 0.5,
} as const

export const DEFAULT_WASM_WIND = {
  breath: 0.3,
  pressure: 0.45,
  brightness: 0.45,
  resonance: 0.15,
} as const

export const DEFAULT_WASM_PIANO = {
  spread: 0.18,
  hammer: 0.55,
  brightness: 0.5,
  damping: 0.45,
} as const

export const DEFAULT_WASM_TIMPANI = {
  tension: 0.5,
  decay: 0.55,
  tone: 0.45,
  strike: 0.6,
} as const

export const DEFAULT_WASM_BOWED = {
  bow: 0.24,
  pressure: 0.5,
  vib: 0.35,
  body: 0.55,
} as const

export const DEFAULT_WASM_GUITAR = {
  pick: 0.35,
  body: 0.38,
  damping: 0.5,
  position: 0.45,
} as const

export const DEFAULT_WASM_ORGAN = {
  drawbar: 0.7,
  click: 0.15,
  leak: 0.2,
  bright: 0.5,
} as const

export type WASM_VOICE_ENVELOPE = {
  attack: number
  decay: number
  sustain: number
  release: number
}

export type WASM_PLUCK_PARAMS = {
  structure: number
  brightness: number
  damping: number
  accent: number
}

export type WASM_STRING_ENSEMBLE_PARAMS = {
  detune: number
  pwm: number
  vib: number
  filter: number
}

export type WASM_WIND_PARAMS = {
  breath: number
  pressure: number
  brightness: number
  resonance: number
}

export type WASM_PIANO_PARAMS = {
  spread: number
  hammer: number
  brightness: number
  damping: number
}

export type WASM_TIMPANI_PARAMS = {
  tension: number
  decay: number
  tone: number
  strike: number
}

export type WASM_BOWED_PARAMS = {
  bow: number
  pressure: number
  vib: number
  body: number
}

export type WASM_GUITAR_PARAMS = {
  pick: number
  body: number
  damping: number
  position: number
}

export type WASM_ORGAN_PARAMS = {
  drawbar: number
  click: number
  leak: number
  bright: number
}

function writetimbreslots(
  out: number[],
  base: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
) {
  out[base + 6] = p0
  out[base + 7] = p1
  out[base + 8] = p2
  out[base + 9] = p3
}

export function wasmvoicecfgtosab(voicestate: WASM_VOICE_STATE[]): number[] {
  const out = new Array(WASM_VOICE_CFG_BLOCK).fill(0)
  for (let i = 0; i < voicestate.length; i++) {
    const base = i * WASM_VOICE_CFG_STRIDE
    const env = voicestate[i].envelope
    const voice = voicestate[i]
    out[base] = env.attack
    out[base + 1] = env.decay
    out[base + 2] = env.sustain
    out[base + 3] = env.release
    out[base + 4] = voice.portamento
    out[base + 5] = voice.volume
    switch (voice.type) {
      case SOURCE_TYPE.STRING_VOICE:
        if (voice.algo === 0) {
          const s = voice.stringensemble
          writetimbreslots(out, base, s.detune, s.pwm, s.vib, s.filter)
        } else {
          const p = voice.pluck
          writetimbreslots(
            out,
            base,
            p.structure,
            p.brightness,
            p.damping,
            p.accent,
          )
        }
        break
      case SOURCE_TYPE.WIND_VOICE: {
        const w = voice.wind
        writetimbreslots(
          out,
          base,
          w.breath,
          w.pressure,
          w.brightness,
          w.resonance,
        )
        break
      }
      case SOURCE_TYPE.PIANO_VOICE: {
        const p = voice.piano
        writetimbreslots(
          out,
          base,
          p.spread,
          p.hammer,
          p.brightness,
          p.damping,
        )
        break
      }
      case SOURCE_TYPE.TIMPANI_VOICE: {
        const t = voice.timpani
        writetimbreslots(out, base, t.tension, t.decay, t.tone, t.strike)
        break
      }
      case SOURCE_TYPE.BOWED_VOICE: {
        const b = voice.bowed
        writetimbreslots(out, base, b.bow, b.pressure, b.vib, b.body)
        break
      }
      case SOURCE_TYPE.GUITAR_VOICE: {
        const g = voice.guitar
        writetimbreslots(out, base, g.pick, g.body, g.damping, g.position)
        break
      }
      case SOURCE_TYPE.ORGAN_VOICE: {
        const o = voice.organ
        writetimbreslots(out, base, o.drawbar, o.click, o.leak, o.bright)
        break
      }
      default:
        break
    }
  }
  return out
}

export function initwasmvoicecfgsab(
  maxi: SabEngine,
  voicestate: WASM_VOICE_STATE[],
) {
  pushwasmvoicecfgsab(maxi, voicestate)
}

export function pushwasmvoicecfgsab(
  maxi: SabEngine,
  voicestate: WASM_VOICE_STATE[],
) {
  pushwasmsabvalues(maxi, WASM_VOICE_CFG_SAB, wasmvoicecfgtosab(voicestate))
}
