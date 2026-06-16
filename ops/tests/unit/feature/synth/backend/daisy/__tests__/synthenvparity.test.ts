import {
  SYNTH_ENV_RELEASE_CHECKPOINTS_SEC,
  SYNTH_ENV_SUSTAIN_TOL_DB,
  evalsynthenvparitygate,
} from 'zss/feature/synth/backend/daisy/synthenvparitygate'
import {
  SYNTH_ENV_PARITY_ADSR,
  SYNTH_ENV_PARITY_GATE_SEC,
} from 'zss/feature/synth/backend/daisy/synthenvparityscenario'
import { ZssLinearEnv } from 'zss/feature/synth/backend/wasm/adsrenvcurve'

const SAMPLERATE = 44100

jest.setTimeout(15_000)

describe('synthenvparity', () => {
  it('uses long release in repro ADSR', () => {
    expect(SYNTH_ENV_PARITY_ADSR[3]).toBe(10)
    expect(SYNTH_ENV_RELEASE_CHECKPOINTS_SEC).toContain(6)
  })

  it('passes gate when sustain and release checkpoints align', () => {
    const gate = evalsynthenvparitygate({
      metrics: {
        id: 'synth-env-square-long',
        gatesec: SYNTH_ENV_PARITY_GATE_SEC,
        releasesec: 10,
        sustainmediandb: { daisy: -12, tone: -14 },
        checkpoints: [
          {
            secafternoteoff: 1,
            daisypeakdb: -20,
            tonepeakdb: -22,
            daisyrmsdb: -28,
            tonermsdb: -30,
          },
        ],
      },
      daisy: { overallpeakdb: -10 } as never,
      tone: { overallpeakdb: -10 } as never,
    })
    expect(gate.pass).toBe(true)
    expect(gate.required).toBe(true)
  })

  it('fails required gate when release tail is silent on Daisy only', () => {
    const gate = evalsynthenvparitygate({
      metrics: {
        id: 'synth-env-fmsquare-repro',
        gatesec: 1,
        releasesec: 10,
        sustainmediandb: { daisy: -12, tone: -12 },
        checkpoints: [
          {
            secafternoteoff: 3,
            daisypeakdb: -80,
            tonepeakdb: -25,
            daisyrmsdb: -90,
            tonermsdb: -35,
          },
        ],
      },
      daisy: { overallpeakdb: -10 } as never,
      tone: { overallpeakdb: -10 } as never,
    })
    expect(gate.pass).toBe(false)
    expect(gate.required).toBe(true)
  })

  it('ZssLinearEnv reaches low level after 10s release', () => {
    const env = new ZssLinearEnv(SAMPLERATE)
    env.setparams({
      attacksec: SYNTH_ENV_PARITY_ADSR[0],
      decaysec: SYNTH_ENV_PARITY_ADSR[1],
      sustain: SYNTH_ENV_PARITY_ADSR[2],
      releasesec: SYNTH_ENV_PARITY_ADSR[3],
    })
    const gatesamples = Math.round(SYNTH_ENV_PARITY_GATE_SEC * SAMPLERATE)
    const releasehold = Math.round(SYNTH_ENV_PARITY_ADSR[3] * SAMPLERATE * 2)
    let level = 0
    for (let i = 0; i < gatesamples + releasehold; i++) {
      level = env.process(i < gatesamples)
    }
    expect(level).toBeLessThan(0.05)
  })

  it('documents sustain tolerance', () => {
    expect(SYNTH_ENV_SUSTAIN_TOL_DB).toBeGreaterThanOrEqual(4)
  })
})
