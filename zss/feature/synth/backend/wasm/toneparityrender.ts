import { Offline } from 'tone'

import { createsynth } from '../../archive/tone/index'
import { addfcrushmodule } from '../../archive/tone/fcrushworkletnode'
import { addsidechainmodule } from '../../archive/tone/sidechainworkletnode'
import { synthvoiceconfig } from '../../archive/tone/voiceconfig/index'
import { invokeplay, parseplay, tonenotationseconds } from '../../playnotation'
import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import { isstring } from 'zss/mapping/types'

import { synthvoicefxconfig } from '../../archive/tone/voicefx/index'
import type {
  DRUM_PARITY_PATCH,
  FX_PARITY_PATCH,
  PARITY_PATCH,
} from './paritypatches'
import {
  type PARITY_AUDIO_METRICS,
  audiobuffermetrics,
  silentparitymetrics,
} from './paritymetrics'
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

function toneaudiobuffer(buffer: Awaited<ReturnType<typeof Offline>>): AudioBuffer {
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
    synthvoiceconfig('', synth, patch.voiceindex, patch.voiceconfig, '')
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
