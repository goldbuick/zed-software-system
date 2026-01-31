import { createdevice } from 'zss/device'
import {
  MODEL_CALLER,
  MODEL_ID,
  createmodelcaller,
} from 'zss/feature/heavy/model'
import { requestaudiobytes, requestinfo } from 'zss/feature/heavy/tts'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { apierror, apilog } from './api'

const modelcallers: Record<string, MODEL_CALLER> = {}

const heavy = createdevice('heavy', [], (message) => {
  if (!heavy.session(message)) {
    return
  }
  switch (message.target) {
    case 'ttsinfo':
      doasync(heavy, message.player, async () => {
        if (isarray(message.data)) {
          const [engine, info] = message.data as [
            engine: 'kitten' | 'piper',
            info: string,
          ]
          const data = await requestinfo(message.player, engine, info)
          if (ispresent(data)) {
            heavy.reply(message, 'heavy:ttsinfo', data)
          }
        }
      })
      break
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
    case 'modelprompt':
      doasync(heavy, message.player, async () => {
        if (!isarray(message.data) || message.data.length < 2) {
          return
        }
        const [agentid, prompt] = message.data as [string, string]
        let modelcaller = modelcallers[agentid]
        if (!ispresent(modelcaller)) {
          modelcallers[agentid] = modelcaller = await createmodelcaller(
            MODEL_ID,
            'causal',
            (msg) => apilog(heavy, message.player, '$5', msg),
          )
        }
        if (ispresent(modelcaller)) {
          const response = await modelcaller.call([
            {
              role: 'system',
              content: 'You are a helpful video game player assistant.',
            },
            { role: 'user', content: prompt },
          ])
          response.split('\n').forEach((line) => {
            apilog(heavy, message.player, '$5', line)
          })
        } else {
          apierror(
            heavy,
            message.player,
            'heavy',
            `agent ${agentid} did not start successfully`,
          )
        }
      })
      break
    case 'modelstop':
      if (isstring(message.data)) {
        const agentid = message.data
        const modelcaller = modelcallers[agentid]
        if (ispresent(modelcaller)) {
          modelcaller.destroy()
          delete modelcallers[agentid]
        }
      }
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
