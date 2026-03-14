import { createdevice } from 'zss/device'
import { createmodelcaller } from 'zss/feature/heavy/model'
import { requestaudiobytes, requestinfo } from 'zss/feature/heavy/tts'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { apierror, apilog } from './api'

/** Lazy-loaded to defer heavy deps (transformers, onnx) until first use */
const modelcallers: Record<
  string,
  { call: any; clearpastvalues: any; destroy: any }
> = {}

const heavy = createdevice('heavy', [], (message) => {
  if (!heavy.session(message)) {
    return
  }
  switch (message.target) {
    case 'ttsinfo':
      doasync(heavy, message.player, async () => {
        if (isarray(message.data)) {
          const [engine, info] = message.data as [
            engine: 'piper' | 'supertonic',
            info: string,
          ]
          const data = await requestinfo(message.player, engine, info)
          heavy.reply(message, 'heavy:ttsinfo', ispresent(data) ? data : [])
        }
      })
      break
    case 'ttsrequest':
      doasync(heavy, message.player, async () => {
        if (isarray(message.data)) {
          const [engine, config, voice, phrase] = message.data as [
            engine: 'piper' | 'supertonic',
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
          heavy.reply(
            message,
            'heavy:ttsrequest',
            ispresent(audiobytes) ? audiobytes : undefined,
          )
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
