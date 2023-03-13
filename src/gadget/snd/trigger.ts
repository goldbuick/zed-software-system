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

const sfxFiles = {
  [SOUND.ALERT]: 'audio/alert.wav',
  [SOUND.BUTTON1]: 'audio/button1.wav',
  [SOUND.BUTTON2]: 'audio/button2.wav',
  [SOUND.BUTTON3]: 'audio/button3.wav',
  [SOUND.DOOROPEN]: 'audio/dooropen.wav',
  [SOUND.DOORSLAM]: 'audio/doorslam.wav',
  [SOUND.ERROR]: 'audio/error.wav',
  [SOUND.IMRCV]: 'audio/imrcv.wav',
  [SOUND.IMSEND]: 'audio/imsend.wav',
  [SOUND.INTRO]: 'audio/intro.wav',
  [SOUND.ROLLOVER1]: 'audio/rollover1.wav',
  [SOUND.ROLLOVER2]: 'audio/rollover2.wav',
  [SOUND.SUCCESS]: 'audio/success.wav',
}

const trigger: Record<string, (useRng?: boolean) => void> = {}

Object.keys(sfxFiles).forEach(async (snd) => {
  trigger[snd] = (useRng = false) => {
    if (audioBuffer) {
      playAudioBuffer(snd, audioBuffer, useRng)
    }
  }

  const audioBuffer = await loadSoundUrl(
    (sfxFiles as Record<string, string>)[snd.toLowerCase()],
  )
})

export default trigger
