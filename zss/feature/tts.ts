/* eslint-disable @typescript-eslint/no-floating-promises */
import { newQueue } from '@henrygd/queue'
import { EdgeSpeechTTS } from '@lobehub/tts'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'

// get MicrosoftSpeechTTS instance
let tts: MAYBE<EdgeSpeechTTS>

async function requestaudiobuffer(
  voice: string,
  input: string,
): Promise<MAYBE<AudioBuffer>> {
  return new Promise((resolve, reject) => {
    if (!ispresent(tts)) {
      tts = new EdgeSpeechTTS({ locale: 'en-US' })
    }
    const timer = setTimeout(reject, 5000)
    tts
      .createAudio({
        input,
        options: { voice },
      })
      .then((audiobuffer) => {
        clearTimeout(timer)
        resolve(audiobuffer)
      })
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
