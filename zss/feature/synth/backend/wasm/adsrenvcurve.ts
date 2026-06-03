/**
 * TypeScript port of Daisy `ZssLinearEnv` (Tone-shaped: linear attack, exponential decay/release).
 * See zss/feature/synth/backend/daisy/native/zss/zss_types.h
 */

export const ENV_PARITY_ADSR_SEC = {
  attack: 0.03,
  decay: 0.2,
  sustain: 0.03,
  release: 0.1,
} as const

export type ZSS_LINEAR_ENV_PARAMS = {
  attacksec: number
  decaysec: number
  sustain: number
  releasesec: number
}

type ZSS_LINEAR_ENV_STAGE = 'idle' | 'attack' | 'decay' | 'sustain' | 'release'

function onepolecoef(sec: number, samplerate: number): number {
  const tau = Math.max(1, sec * samplerate)
  return 1 - Math.exp(-1 / tau)
}

export class ZssLinearEnv {
  private attacksec = 0.01
  private decaysec = 0.01
  private sustain = 0.5
  private releasesec = 0.01
  private level = 0
  private stage: ZSS_LINEAR_ENV_STAGE = 'idle'
  private gateprev = false
  private atkinc = 0
  private deccoef = 0
  private relcoef = 0

  constructor(private samplerate: number) {}

  setparams(params: ZSS_LINEAR_ENV_PARAMS) {
    this.attacksec = Math.max(0.001, params.attacksec)
    this.decaysec = Math.max(0.001, params.decaysec)
    this.sustain = Math.max(0, Math.min(1, params.sustain))
    this.releasesec = Math.max(0.001, params.releasesec)
    this.refreshinc()
  }

  reset() {
    this.level = 0
    this.stage = 'idle'
    this.gateprev = false
  }

  private refreshinc() {
    const sr = this.samplerate
    this.atkinc = 1 / Math.max(1, this.attacksec * sr)
    this.deccoef = onepolecoef(this.decaysec, sr)
    this.relcoef = onepolecoef(this.releasesec, sr)
  }

  process(gate: boolean): number {
    const g = gate
    if (g && !this.gateprev) {
      this.stage = 'attack'
      this.level = 0
    } else if (!g && this.gateprev) {
      this.stage = 'release'
    }
    this.gateprev = g

    switch (this.stage) {
      case 'attack':
        this.level += this.atkinc
        if (this.level >= 1) {
          this.level = 1
          this.stage = 'decay'
        }
        break
      case 'decay':
        this.level += (this.sustain - this.level) * this.deccoef
        if (this.level <= this.sustain + 1e-5) {
          this.level = this.sustain
          this.stage = g ? 'sustain' : 'release'
        }
        break
      case 'sustain':
        this.level = this.sustain
        if (!g) {
          this.stage = 'release'
        }
        break
      case 'release':
        this.level += (0 - this.level) * this.relcoef
        if (this.level <= 1e-5) {
          this.level = 0
          this.stage = 'idle'
        }
        break
      case 'idle':
      default:
        this.level = 0
        if (g) {
          this.stage = 'attack'
        }
        break
    }
    return this.level
  }

  /** Unit-gain envelope for an explicit gate timeline. */
  rendergate(
    gatesamplecount: number,
    totalsamples: number,
  ): Float32Array {
    const out = new Float32Array(totalsamples)
    for (let i = 0; i < totalsamples; i++) {
      out[i] = this.process(i < gatesamplecount)
    }
    return out
  }
}

const C4_HZ = 261.6255653005986
const CARRIER_GAIN = 0.25

/** Sine at C4 × envelope — matches minimal Tone.Synth offline parity render. */
export function renderzssenvparitysignal(
  gatesec: number,
  totalsec: number,
  samplerate: number,
): Float32Array {
  const gatesamples = Math.round(gatesec * samplerate)
  const totalsamples = Math.round(totalsec * samplerate)
  const env = new ZssLinearEnv(samplerate)
  env.setparams(defaultenvparityparams())
  const envelope = env.rendergate(gatesamples, totalsamples)
  const out = new Float32Array(totalsamples)
  for (let i = 0; i < totalsamples; i++) {
    const phase = (2 * Math.PI * C4_HZ * i) / samplerate
    out[i] = Math.sin(phase) * envelope[i] * CARRIER_GAIN
  }
  return out
}

export function defaultenvparityparams(): ZSS_LINEAR_ENV_PARAMS {
  return {
    attacksec: ENV_PARITY_ADSR_SEC.attack,
    decaysec: ENV_PARITY_ADSR_SEC.decay,
    sustain: ENV_PARITY_ADSR_SEC.sustain,
    releasesec: ENV_PARITY_ADSR_SEC.release,
  }
}
