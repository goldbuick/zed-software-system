import { Offline } from 'tone'
import { isstring } from 'zss/mapping/types'

import { addfcrushmodule } from '../../archive/tone/fcrushworkletnode'
import { createsynth } from '../../archive/tone/index'
import { addsidechainmodule } from '../../archive/tone/sidechainworkletnode'
import { synthvoiceconfig } from '../../archive/tone/voiceconfig/index'
import { synthvoicefxconfig } from '../../archive/tone/voicefx/index'
import { invokeplay, parseplay, tonenotationseconds } from '../../playnotation'
import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import { SYNTH_PLAY_VOICE_COUNT } from '../../synthdefaults.ts'
import type { LEVEL_STABILITY_SCENARIO } from '../daisy/levelstabilityscenarios.ts'
import { estimatesequencedurationsec } from '../daisy/scalecrewsong.ts'

import {
  type PARITY_AUDIO_METRICS,
  audiobuffermetrics,
  silentparitymetrics,
} from './paritymetrics'
import type {
  DRUM_PARITY_PATCH,
  FX_PARITY_PATCH,
  MAIN_DYNAMICS_PARITY_PATCH,
  PARITY_PATCH,
} from './paritypatches'
import { applytoneparityvoiceconfigs } from './paritypatchvoice'
import { TONE_PARITY_EXCLUDED } from './paritytolerances'

const PARITY_SAMPLERATE = 44100
const PARITY_REPLAY_OFFSET_SEC = 0.05

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

function patchentries(notation: string): SYNTH_NOTE_ENTRY[] {
  const invoke = parseplay(notation)[0]
  return invokeplay(0, 0, invoke, true)
}

function toneaudiobuffer(
  buffer: Awaited<ReturnType<typeof Offline>>,
): AudioBuffer {
  const native = typeof buffer.get === 'function' ? buffer.get() : buffer
  return native as AudioBuffer
}

async function rendertoneoffline(
  rendersec: number,
  setup: (synth: ReturnType<typeof createsynth>) => void,
): Promise<AudioBuffer> {
  const buffer = await Offline(async ({ transport }) => {
    await addfcrushmodule()
    await addsidechainmodule()
    const synth = createsynth()
    setup(synth)
    transport.start(0)
  }, rendersec)
  return toneaudiobuffer(buffer)
}

export async function rendertoneparitypatch(
  patch: PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }
  if ((TONE_PARITY_EXCLUDED as readonly string[]).includes(patch.id)) {
    return silentparitymetrics(PARITY_SAMPLERATE)
  }

  const ticks = patchentries(patch.notation)
  const rendersec = parityrenderlengthsec(patch.durationsec, ticks)

  const buffer = await rendertoneoffline(rendersec, (synth) => {
    synth.setplayvolume(80)
    synth.setbgplayvolume(100)
    applytoneparityvoiceconfigs(synth, patch)
    synth.synthreplay(ticks, patch.durationsec)
  })

  return audiobuffermetrics(buffer)
}

export async function rendertoneparitydrumpatch(
  patch: DRUM_PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const ticks = patchentries(patch.notation)
  const rendersec = parityrenderlengthsec(patch.durationsec, ticks)

  const buffer = await rendertoneoffline(rendersec, (synth) => {
    synth.setplayvolume(80)
    synth.setbgplayvolume(100)
    synth.synthreplay(ticks, patch.durationsec)
  })

  return audiobuffermetrics(buffer)
}

export async function rendertoneparityfxpatch(
  patch: FX_PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const ticks = patchentries(patch.notation)
  const rendersec = parityrenderlengthsec(patch.durationsec, ticks)
  const buffer = await rendertoneoffline(rendersec, (synth) => {
    synth.setplayvolume(80)
    synth.setbgplayvolume(100)
    synthvoiceconfig('', synth, patch.voiceindex, patch.voiceconfig, '')
    synthvoicefxconfig(
      '',
      synth,
      patch.voiceindex,
      patch.fx as 'echo',
      patch.fxconfig,
      patch.fxvalue,
    )
    synth.synthreplay(ticks, patch.durationsec)
  })

  return audiobuffermetrics(buffer)
}

export async function rendertoneparitymainpatch(
  patch: MAIN_DYNAMICS_PARITY_PATCH,
): Promise<PARITY_AUDIO_METRICS> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  const rendersec = parityrenderlengthsec(patch.durationsec, patch.ticks)
  const buffer = await rendertoneoffline(rendersec, (synth) => {
    synth.setplayvolume(80)
    synth.setbgplayvolume(100)
    synthvoiceconfig('', synth, 0, patch.voiceconfig, '')
    for (let vi = 4; vi < 8; vi++) {
      synthvoiceconfig('', synth, vi, patch.voiceconfig, '')
    }
    synth.synthreplay(patch.ticks, patch.durationsec)
  })

  return audiobuffermetrics(buffer)
}

function applytonelevelvoiceconfigs(
  synth: ReturnType<typeof createsynth>,
  scenario: LEVEL_STABILITY_SCENARIO,
) {
  if (scenario.voiceconfigs) {
    for (let ch = 0; ch < SYNTH_PLAY_VOICE_COUNT; ch++) {
      for (const [config, value] of scenario.voiceconfigs) {
        synthvoiceconfig('', synth, ch, config, value)
      }
    }
    return
  }
  if (scenario.voiceconfig) {
    synthvoiceconfig('', synth, 0, scenario.voiceconfig, '')
  }
}

/** Offline Tone render for level-stability / env-parity scenarios. */
export async function rendertonelevelscenario(
  scenario: LEVEL_STABILITY_SCENARIO,
): Promise<AudioBuffer> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext not available')
  }

  let rendersec = scenario.durationsec ?? 3
  if (scenario.playsequence) {
    rendersec = Math.max(
      estimatesequencedurationsec(scenario.playsequence),
      rendersec,
    )
  } else if (scenario.ticks) {
    rendersec = parityrenderlengthsec(rendersec, scenario.ticks)
  } else if (scenario.notation) {
    const ticks = patchentries(scenario.notation)
    rendersec = parityrenderlengthsec(rendersec, ticks)
  }

  const buffer = await rendertoneoffline(rendersec, (synth) => {
    synth.setplayvolume(80)
    synth.setbgplayvolume(100)
    applytonelevelvoiceconfigs(synth, scenario)

    if (scenario.playsequence) {
      for (let i = 0; i < scenario.playsequence.length; i++) {
        synth.addplay(scenario.playsequence[i])
      }
      return
    }

    const ticks = scenario.ticks ?? patchentries(scenario.notation ?? '+hc')
    synth.synthreplay(ticks, rendersec)
  })

  return buffer
}
