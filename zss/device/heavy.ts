import { createdevice } from 'zss/device'
import { requestaudiobytes } from 'zss/feature/heavy/tts'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent } from 'zss/mapping/types'

import { apierror } from './api'

const heavy = createdevice('heavy', [], (message) => {
  if (!heavy.session(message)) {
    return
  }
  switch (message.target) {
    case 'ttsrequest':
      doasync(heavy, message.player, async () => {
        if (isarray(message.data)) {
          const [engine, config, voice, phrase] = message.data as [
            engine: 'kitten' | 'piper',
            config: string,
            voice: string,
            phrase: string,
          ]
          const audiobytes = await requestaudiobytes(
            message.player,
            engine,
            config,
            voice,
            phrase,
          )
          if (ispresent(audiobytes)) {
            heavy.reply(message, 'heavy:ttsrequest', audiobytes)
          }
        }
      })
      break
    default:
      apierror(
        heavy,
        message.player,
        'heavy',
        `unknown message ${message.target}`,
      )
      break
  }
})
