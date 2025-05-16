import { Client } from '@gradio/client'
import { EdgeSpeechTTS } from '@lobehub/tts'
import { ToneAudioBuffer } from 'tone'
import { api_log } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'

// get MicrosoftSpeechTTS instance
let tts: MAYBE<EdgeSpeechTTS>

export async function playtts(synth: MAYBE<AUDIO_SYNTH>, data: string[]) {
  if (!ispresent(synth)) {
    return
  }
  if (!ispresent(tts)) {
    tts = new EdgeSpeechTTS({ locale: 'en-US' })
  }
  const [voice, phrase] = data
  const audiobuffer = await tts.createAudio({
    input: phrase,
    options: { voice: voice || 'en-US-GuyNeural' },
  })
  // play the audio
  synth.addttsaudiobuffer(audiobuffer)
}

// cache for #tta command
const tta = new Map<string, ToneAudioBuffer>()

export async function playtta(
  player: string,
  synth: MAYBE<AUDIO_SYNTH>,
  data: string[],
) {
  if (!ispresent(synth)) {
    return
  }
  const [phrase] = data
  const maybebuffer = tta.get(phrase)
  if (ispresent(maybebuffer)) {
    // play the audio if
    if (maybebuffer.loaded) {
      synth.addttsaudiobuffer(maybebuffer)
    }
  } else {
    // fetch buffer
    const app = await Client.connect('declare-lab/TangoFlux')
    const result = await app.predict('/predict', [phrase, 25, 4.5, 3])
    if (isarray(result.data) && isstring(result.data[0]?.url)) {
      const loadurl: string = result.data[0]?.url
      tta.set(
        phrase,
        new ToneAudioBuffer(loadurl, () => {
          api_log(
            SOFTWARE,
            player,
            'loaded',
            `${loadurl.substring(0, 8)}...${loadurl.slice(-8)}`,
          )
        }),
      )
    }
  }
}
