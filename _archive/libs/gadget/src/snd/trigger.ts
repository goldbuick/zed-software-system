import * as sfxFiles from 'url:./files/*.wav'

import { loadSoundUrl, playAudioBuffer } from './context'

enum SOUND {
  ALERT,
  BUTTON1,
  BUTTON2,
  BUTTON3,
  DOOROPEN,
  DOORSLAM,
  ERROR,
  IMRCV,
  IMSEND,
  INTRO,
  ROLLOVER1,
  ROLLOVER2,
  SUCCESS,
}

const trigger: Record<string, (useRng?: boolean) => void> = {}

Object.keys(SOUND).forEach(async (snd) => {
  if (isNaN(Number(snd))) {
    trigger[snd] = (useRng = false) => {
      if (audioBuffer) {
        playAudioBuffer(snd, audioBuffer, useRng)
      }
    }

    const audioBuffer = await loadSoundUrl(
      (sfxFiles as Record<string, string>)[snd.toLowerCase()],
    )
  }
})

export default trigger
