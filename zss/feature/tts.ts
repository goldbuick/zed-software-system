/* eslint-disable @typescript-eslint/no-floating-promises */
import { newQueue } from '@henrygd/queue'
import { EdgeSpeechTTS, OpenAITTS } from '@lobehub/tts'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'

// yap instances
let edgetts: MAYBE<EdgeSpeechTTS>
let openaitts: MAYBE<OpenAITTS>

function haltttsengine() {
  if (edgetts) {
    edgetts = undefined
  }
  if (openaitts) {
    openaitts = undefined
  }
}

export function selectttsengine(engine: 'edge' | 'openai', apikey: string) {
  haltttsengine()
  switch (engine) {
    case 'edge':
      edgetts = new EdgeSpeechTTS({ locale: 'en-US' })
      break
    case 'openai':
      openaitts = new OpenAITTS({ OPENAI_API_KEY: apikey })
      break
  }
}

async function requestaudiobuffer(
  voice: string,
  input: string,
): Promise<MAYBE<AudioBuffer>> {
  return new Promise((resolve) => {
    if (ispresent(edgetts)) {
      const timer = setTimeout(() => resolve(undefined), 5000)
      edgetts
        .createAudio({
          input,
          options: { voice },
        })
        .then((audiobuffer) => {
          clearTimeout(timer)
          resolve(audiobuffer)
        })
    } else if (ispresent(openaitts)) {
      const timer = setTimeout(() => resolve(undefined), 10000)
      openaitts
        .createAudio({
          input,
          options: {
            model: 'tts-1',
            voice: voice as any,
          },
        })
        .then((audiobuffer) => {
          clearTimeout(timer)
          resolve(audiobuffer)
        })
    } else {
      selectttsengine('edge', '')
      requestaudiobuffer(voice, input).then(resolve)
    }
  })
}

export async function ttsplay(
  synth: MAYBE<AUDIO_SYNTH>,
  voice: string,
  input: string,
): Promise<void> {
  if (!ispresent(synth) || input.trim() === '') {
    return
  }
  // play the audio
  const audiobuffer = await requestaudiobuffer(voice, input)
  if (ispresent(audiobuffer)) {
    synth.addttsaudiobuffer(audiobuffer)
  }
}

// audio playback queue
const audioplayqueue = newQueue(1)

async function audioplaytask(
  synth: MAYBE<AUDIO_SYNTH>,
  audiobuffer: AudioBuffer,
): Promise<void> {
  if (!ispresent(synth)) {
    return
  }

  // play the audio
  synth.addttsaudiobuffer(audiobuffer)

  // wait audio duration before playing next audio
  const waittime = Math.max(1000, Math.round(audiobuffer.duration * 1000))
  await waitfor(waittime)
}

// audio buffer request queue
const audiobufferqueue = newQueue(1)

async function audiobuffertask(
  synth: MAYBE<AUDIO_SYNTH>,
  voice: string,
  input: string,
): Promise<void> {
  const audiobuffer = await requestaudiobuffer(voice, input)
  audioplayqueue.add(async () => {
    if (ispresent(audiobuffer)) {
      await audioplaytask(synth, audiobuffer)
    }
  })
}

export function ttsqueue(
  synth: MAYBE<AUDIO_SYNTH>,
  voice: string,
  input: string,
) {
  audiobufferqueue.add(async () => {
    await audiobuffertask(synth, voice, input)
  })
}

export function ttsclearqueue() {
  audioplayqueue.clear()
  audiobufferqueue.clear()
}
