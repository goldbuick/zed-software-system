import { EdgeSpeechTTS } from '@lobehub/tts'
import { ispresent, MAYBE } from 'zss/mapping/types'

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
