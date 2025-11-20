import { createdevice } from 'zss/device'
import {
  selectttsengine,
  ttsclearqueue,
  ttsplay,
  ttsqueue,
} from 'zss/feature/tts'
import { doasync } from 'zss/mapping/func'
import { isarray } from 'zss/mapping/types'

import { api_error } from './api'

const heavy = createdevice('heavy', [], (message) => {
  if (!heavy.session(message)) {
    return
  }
  switch (message.target) {
    case 'tts':
      doasync(heavy, message.player, async () => {
        if (isarray(message.data)) {
          const [voice, phrase] = message.data as [any, string]
          await ttsplay(message.player, voice, phrase)
        }
      })
      break
    case 'ttsengine':
      doasync(heavy, message.player, async () => {
        if (isarray(message.data)) {
          const [engine, apikey] = message.data as [any, string]
          await selectttsengine(engine, apikey)
        }
      })
      break
    case 'ttsqueue':
      if (isarray(message.data)) {
        const [voice, phrase] = message.data as [string, string]
        ttsqueue(message.player, voice, phrase)
      }
      break
    case 'ttsclearqueue':
      ttsclearqueue()
      break
    default:
      api_error(
        heavy,
        message.player,
        'heavy',
        `unknown message ${message.target}`,
      )
      break
  }
})
