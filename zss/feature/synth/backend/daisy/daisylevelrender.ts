import { isstring } from 'zss/mapping/types'

import { invokeplay, parseplay, tonenotationseconds } from '../../playnotation'
import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import { SYNTH_PLAY_VOICE_COUNT, SYNTH_VOICE_COUNT } from '../../synthdefaults'
import {
  type LEVEL_STABILITY_METRICS,
  analyzelevelstability,
  comparelevelstability,
  diagnoselevelstability,
  formatlevelstabilityline,
} from '../wasm/levelstabilitymetrics'
import { playpatternendtime } from '../wasm/playstart'
import { defaultwasmalgoconfig } from '../wasm/wasmalgoconfigsab'
import { applywasmfxconfig, defaultwasmfxsab } from '../wasm/wasmfxstate'
import { WASM_DEFAULT_TTS_VOLUME, pushwasmmainsab } from '../wasm/wasmmainsab'
import { defaultwasmoscconfig } from '../wasm/wasmoscconfigsab'
import type { WASM_REPLAY_STATE } from '../wasm/wasmreplaystate'
import { defaultwasmvoicestate } from '../wasm/wasmvoiceconfig'

import { bootisolateddaisyengine, startisolateddaisydsp } from './daisyengine'
import { createdaisysynth } from './daisysynth'
import type { LEVEL_STABILITY_SCENARIO } from './levelstabilityscenarios'

const RENDER_SAMPLERATE = 44100
const PARITY_REPLAY_OFFSET_SEC = 0.05

export type LEVEL_STABILITY_RENDER = {
  samples: Float32Array
  samplerate: number
  rendersec: number
}

export type LEVEL_STABILITY_SCENARIO_RESULT = {
  metrics: LEVEL_STABILITY_METRICS
}

export type LEVEL_STABILITY_SUITE_RESULT = {
  metrics: Record<string, LEVEL_STABILITY_METRICS>
  diagnosis: string[]
}

function parityrenderlengthsec(
  durationsec: number,
  ticks: SYNTH_NOTE_ENTRY[],
): number {
  let latest = durationsec
  for (let i = 0; i < ticks.length; i++) {
    const [time, value] = ticks[i]
    const [, notation] = value
    let eventend = time + PARITY_REPLAY_OFFSET_SEC
    if (isstring(notation)) {
      eventend += tonenotationseconds(notation)
    }
    if (eventend > latest) {
      latest = eventend
    }
  }
  return Math.max(latest + 0.15, durationsec + 1.0)
}

function buildreplay(scenario: LEVEL_STABILITY_SCENARIO): WASM_REPLAY_STATE {
  const fxsab = defaultwasmfxsab()
  for (const fx of scenario.fx ?? []) {
    applywasmfxconfig(fxsab, fx.group ?? 0, fx.fx, fx.config, fx.value ?? '')
    if (fx.group === undefined) {
      applywasmfxconfig(fxsab, 1, fx.fx, fx.config, fx.value ?? '')
    }
  }
  return {
    voicecfg: defaultwasmvoicestate(),
    oscconfig: defaultwasmoscconfig(),
    algoconfig: defaultwasmalgoconfig(),
    fxsab,
    playvolume: 80,
    bgplayvolume: 100,
  }
}

function applyscenariomainbussab(
  engine: Awaited<ReturnType<typeof bootisolateddaisyengine>>,
  scenario: LEVEL_STABILITY_SCENARIO,
) {
  if (!scenario.maincompbypass && !scenario.sidechainbypass) {
    return
  }
  pushwasmmainsab(engine, [
    80,
    100,
    WASM_DEFAULT_TTS_VOLUME,
    scenario.maincompbypass ? 1 : 0,
    scenario.sidechainbypass ? 1 : 0,
  ])
}

function applyscenariovoiceconfigs(
  synth: ReturnType<typeof createdaisysynth>,
  scenario: LEVEL_STABILITY_SCENARIO,
) {
  if (scenario.voiceconfigs) {
    for (let ch = 0; ch < SYNTH_PLAY_VOICE_COUNT; ch++) {
      for (const [config, value] of scenario.voiceconfigs) {
        synth.setvoiceconfig(ch, config, value)
      }
    }
    return
  }
  if (scenario.voiceconfig) {
    synth.setvoiceconfig(0, scenario.voiceconfig, '')
    for (let vi = SYNTH_PLAY_VOICE_COUNT; vi < SYNTH_VOICE_COUNT; vi++) {
      synth.setvoiceconfig(vi, scenario.voiceconfig, '')
    }
  }
}

function scenarioticks(scenario: LEVEL_STABILITY_SCENARIO): SYNTH_NOTE_ENTRY[] {
  if (scenario.ticks) {
    return scenario.ticks
  }
  if (!scenario.notation) {
    throw new Error(
      `scenario ${scenario.id} needs notation, ticks, or playsequence`,
    )
  }
  const invoke = parseplay(scenario.notation)[0]
  return invokeplay(0, 0, invoke, true)
}

function monobuffer(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0).slice()
  }
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const mono = new Float32Array(left.length)
  for (let i = 0; i < left.length; i++) {
    mono[i] = (left[i] + right[i]) * 0.5
  }
  return mono
}

function estimatesequencefromplays(plays: string[]): number {
  let pacertime = 0
  for (let p = 0; p < plays.length; p++) {
    const invokes = parseplay(plays[p])
    const starttime = pacertime
    let end = starttime
    for (let i = 0; i < invokes.length && i < SYNTH_PLAY_VOICE_COUNT; i++) {
      const pattern = invokeplay(i, starttime, invokes[i], true)
      end = Math.max(end, playpatternendtime(pattern, starttime))
    }
    pacertime = end
  }
  return pacertime + 1.5
}

export async function renderdaisylevelscenario(
  scenario: LEVEL_STABILITY_SCENARIO,
): Promise<LEVEL_STABILITY_RENDER> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  let rendersec = scenario.durationsec ?? 3
  if (scenario.playsequence) {
    rendersec = estimatesequencefromplays(scenario.playsequence)
  } else {
    const ticks = scenarioticks(scenario)
    rendersec = parityrenderlengthsec(rendersec, ticks)
  }

  const length = Math.max(1, Math.ceil(rendersec * RENDER_SAMPLERATE))
  const offlinectx = new OfflineAudioContext(1, length, RENDER_SAMPLERATE)

  const engine = await bootisolateddaisyengine(offlinectx)
  startisolateddaisydsp(engine, 80, 100, WASM_DEFAULT_TTS_VOLUME)

  const synth = createdaisysynth(engine)
  synth.applyreplay(buildreplay(scenario))
  applyscenariovoiceconfigs(synth, scenario)
  synth.setplayvolume(80)
  synth.setbgplayvolume(100)
  applyscenariomainbussab(engine, scenario)

  if (scenario.playsequence) {
    for (let i = 0; i < scenario.playsequence.length; i++) {
      synth.addplay(scenario.playsequence[i])
    }
  } else {
    const ticks = scenarioticks(scenario)
    synth.synthreplay(ticks, rendersec)
  }

  synth.prepareofflinerender()

  const buffer = await offlinectx.startRendering()
  synth.destroy()

  return {
    samples: monobuffer(buffer),
    samplerate: buffer.sampleRate,
    rendersec,
  }
}

export async function renderdaisylevelmetrics(
  scenario: LEVEL_STABILITY_SCENARIO,
  windowms = 46,
): Promise<LEVEL_STABILITY_SCENARIO_RESULT> {
  const render = await renderdaisylevelscenario(scenario)
  return {
    metrics: analyzelevelstability(render.samples, render.samplerate, windowms),
  }
}

export async function runlevelstabilitysuite(
  scenarios: LEVEL_STABILITY_SCENARIO[],
  comparepairs: [string, string][],
  windowms = 46,
): Promise<LEVEL_STABILITY_SUITE_RESULT> {
  const metrics: Record<string, LEVEL_STABILITY_METRICS> = {}
  for (const scenario of scenarios) {
    const result = await renderdaisylevelmetrics(scenario, windowms)
    metrics[scenario.id] = result.metrics
  }
  return {
    metrics,
    diagnosis: diagnoselevelstability(metrics, comparepairs),
  }
}

export function formatlevelstabilityreport(
  scenarios: LEVEL_STABILITY_SCENARIO[],
  result: LEVEL_STABILITY_SUITE_RESULT,
): string {
  const lines: string[] = [
    'Daisy offline level stability (46 ms windows, steady = middle 50% of active)',
    'scenario                     spkΔ            srmsΔ           spkσ             pk             steady',
    '-'.repeat(96),
  ]
  for (const scenario of scenarios) {
    const m = result.metrics[scenario.id]
    if (m) {
      lines.push(formatlevelstabilityline(scenario.id, m))
    }
  }
  lines.push('', 'Comparisons (candidate vs baseline):')
  for (const line of result.diagnosis) {
    lines.push(`  ${line}`)
  }
  return lines.join('\n')
}

export {
  analyzelevelstability,
  comparelevelstability,
  formatlevelstabilityline,
}
