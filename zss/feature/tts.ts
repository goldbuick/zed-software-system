import { EdgeSpeechTTS } from '@lobehub/tts'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'

// get MicrosoftSpeechTTS instance
let tts: MAYBE<EdgeSpeechTTS>

export async function ttsplay(
  synth: MAYBE<AUDIO_SYNTH>,
  voice: string,
  input: string,
) {
  if (!ispresent(synth)) {
    return
  }
  if (!ispresent(tts)) {
    tts = new EdgeSpeechTTS({ locale: 'en-US' })
  }
  const audiobuffer = await tts.createAudio({
    input,
    options: { voice },
  })
  // play the audio
  synth.addttsaudiobuffer(audiobuffer)
  return audiobuffer
}

type TTSITEM = [string, string]

let queueactive = false
let nextisactive = false
const nexttts: TTSITEM[] = []

async function handlenexttts(synth: MAYBE<AUDIO_SYNTH>) {
  nextisactive = true

  // grab next
  const [voice, input] = nexttts.shift() ?? []
  if (!ispresent(voice) || !ispresent(input)) {
    nextisactive = false
    return
  }

  const timeout = setTimeout(() => {
    nextisactive = false
  }, 5 * 1000)

  const audiobuffer = await ttsplay(synth, voice, input)
  const waittime = Math.max(
    1000,
    Math.round((audiobuffer?.duration ?? 0) * 1000) - 1000,
  )

  clearTimeout(timeout)

  setTimeout(() => {
    nextisactive = false
  }, waittime)
}

export function ttsqueue(
  synth: MAYBE<AUDIO_SYNTH>,
  voice: string,
  input: string,
) {
  nexttts.push([voice, input])
  if (!queueactive) {
    queueactive = true
    setInterval(() => {
      if (!nextisactive) {
        handlenexttts(synth).catch((err) => {
          console.info(err)
          nextisactive = false
        })
      }
    }, 1000)
  }
}
