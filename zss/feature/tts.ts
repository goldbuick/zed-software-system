import { EdgeSpeechTTS } from '@lobehub/tts'
import { waitfor } from 'zss/mapping/tick'
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
}

type TTSITEM = [string, string]

let nextisactive = false
const nexttts: TTSITEM[] = []

async function handlenexttts(synth: MAYBE<AUDIO_SYNTH>) {
  // skip while queue
  if (nextisactive) {
    return
  }

  // grab next
  const [voice, input] = nexttts.shift() ?? []
  if (!ispresent(synth) || !ispresent(voice) || !ispresent(input)) {
    return
  }

  // generate audio
  nextisactive = true
  if (!ispresent(tts)) {
    tts = new EdgeSpeechTTS({ locale: 'en-US' })
  }
  const audiobuffer = await tts.createAudio({
    input,
    options: { voice },
  })

  // play the audio
  synth.addttsaudiobuffer(audiobuffer)

  // wait until down
  await waitfor(Math.round(audiobuffer.duration * 1000) + 1000)

  nextisactive = false
  handlenexttts(synth).catch((err) => console.info(err))
}

export function ttsqueue(
  synth: MAYBE<AUDIO_SYNTH>,
  voice: string,
  input: string,
) {
  nexttts.push([voice, input])
  handlenexttts(synth).catch((err) => console.info(err))
}
