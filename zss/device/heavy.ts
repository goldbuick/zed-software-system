import { Message } from '@huggingface/transformers'
import { createdevice } from 'zss/device'
import { formatsystemprompt } from 'zss/feature/heavy/formatstate'
import {
  destroysharedmodel,
  modelgenerate,
  TOOL_CALL,
} from 'zss/feature/heavy/model'
import { requestaudiobytes, requestinfo } from 'zss/feature/heavy/tts'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { apierror, apilog } from './api'

const MAX_HISTORY = 40
const agenthistories: Record<string, Message[]> = {}

function executetoolcalls(
  player: string,
  agentid: string,
  toolcalls: TOOL_CALL[],
) {
  for (let i = 0; i < toolcalls.length; ++i) {
    const call = toolcalls[i]
    switch (call.name) {
      case 'set_agent_name':
        if (isstring(call.args.name)) {
          heavy.emit(player, 'vm:agentname', [agentid, call.args.name])
        }
        break
    }
  }
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
            engine: 'piper' | 'supertonic',
            info: string,
          ]
          const data = await requestinfo(heavy, message.player, engine, info)
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
            heavy,
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
        if (!isarray(message.data) || message.data.length < 3) {
          return
        }
        const [agentid, agentname, prompt] = message.data as [
          string,
          string,
          string,
        ]

        let history = agenthistories[agentid] ?? []
        history.push({ role: 'user', content: prompt })
        if (history.length > MAX_HISTORY) {
          history = history.slice(-MAX_HISTORY)
        }
        agenthistories[agentid] = history

        apilog(heavy, message.player, '$21 input $7', prompt)

        const systemprompt = formatsystemprompt(agentname)
        const result = await modelgenerate(systemprompt, history, (msg) =>
          apilog(heavy, message.player, '$21', msg),
        )

        executetoolcalls(message.player, agentid, result.toolcalls)

        if (result.text) {
          history.push({ role: 'assistant', content: result.text })
          agenthistories[agentid] = history

          console.info('>>>', result.text)
          apilog(heavy, message.player, '$21', result.text)
          heavy.emit(message.player, 'vm:agentresponse', [
            agentid,
            result.text,
          ])
        }
      })
      break
    case 'modelstop':
      if (isstring(message.data)) {
        const agentid = message.data
        delete agenthistories[agentid]
        if (Object.keys(agenthistories).length === 0) {
          destroysharedmodel()
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
