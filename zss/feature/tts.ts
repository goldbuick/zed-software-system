import { EdgeSpeechTTS } from '@lobehub/tts'
import { ispresent, MAYBE } from 'zss/mapping/types'

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
