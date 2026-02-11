import { createdevice } from 'zss/device'
import type { MODEL_CALLER } from 'zss/feature/heavy/model'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { apierror, apilog } from './api'

const modelcallers: Record<string, MODEL_CALLER> = {}

let ttsModule: Promise<
  typeof import('zss/feature/heavy/tts')
> | null = null
function getTtsModule() {
  ttsModule ??= import('zss/feature/heavy/tts')
  return ttsModule
}

let modelModule: Promise<
  typeof import('zss/feature/heavy/model')
> | null = null
function getModelModule() {
  modelModule ??= import('zss/feature/heavy/model')
  return modelModule
}

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
          const { requestinfo } = await getTtsModule()
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
          const { requestaudiobytes } = await getTtsModule()
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
          const { createmodelcaller } = await getModelModule()
          modelcallers[agentid] = modelcaller = await createmodelcaller(
            agentid,
            (msg) => apilog(heavy, message.player, '$21', msg),
          )
        }
        if (ispresent(modelcaller)) {
          // log user prompt input
          apilog(heavy, message.player, '$21 input $7', prompt)
          const response = await modelcaller.call([
            { role: 'user', content: prompt },
          ])
          // log response lines
          console.info('>>>', response)
          apilog(heavy, message.player, '$21', response)
          // clean up memory
          modelcaller.clearpastvalues()
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
