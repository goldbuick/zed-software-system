import { Message } from '@huggingface/transformers'
import { createdevice } from 'zss/device'
import { formatsystemprompt } from 'zss/feature/heavy/formatstate'
import {
  destroysharedmodel,
  modelclassify,
  modelgenerate,
  TOOL_CALL,
} from 'zss/feature/heavy/model'
import { requestaudiobytes, requestinfo } from 'zss/feature/heavy/tts'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { apierror, apilog, apitoast } from './api'

const MAX_HISTORY = 40
const MAX_CLASSIFY_CONTEXT = 3
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

function createonworking(player: string) {
  return (msg: string) => {
    apitoast(heavy, player, msg)
  }
}

async function runagentprompt(
  player: string,
  agentid: string,
  agentname: string,
  prompt: string,
  onworking: (msg: string) => void,
) {
  let history = agenthistories[agentid] ?? []
  history.push({ role: 'user', content: prompt })
  if (history.length > MAX_HISTORY) {
    history = history.slice(-MAX_HISTORY)
  }
  agenthistories[agentid] = history

  apilog(heavy, player, '$21 input $7', prompt)

  const systemprompt = formatsystemprompt(agentname)
  const result = await modelgenerate(systemprompt, history, onworking)

  executetoolcalls(player, agentid, result.toolcalls)

  if (result.text) {
    history.push({ role: 'assistant', content: result.text })
    agenthistories[agentid] = history

    console.info('>>>', result.text)
    apilog(heavy, player, '$21', result.text)
    heavy.emit(player, 'vm:agentresponse', [agentid, result.text])
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
        const onworking = createonworking(message.player)
        await runagentprompt(
          message.player,
          agentid,
          agentname,
          prompt,
          onworking,
        )
      })
      break
    case 'modelclassify':
      doasync(heavy, message.player, async () => {
        if (!isarray(message.data) || message.data.length < 3) {
          return
        }
        const [agentid, agentname, messagetext] = message.data as [
          string,
          string,
          string,
        ]
        const onworking = createonworking(message.player)

        const recenthistory = (agenthistories[agentid] ?? []).slice(
          -MAX_CLASSIFY_CONTEXT,
        )
        let contextsnippet = ''
        if (recenthistory.length > 0) {
          contextsnippet =
            '\nRecent conversation:\n' +
            recenthistory
              .map((m) => `${m.role}: ${m.content}`)
              .join('\n') +
            '\n'
        }

        const classifymessages: Message[] = [
          {
            role: 'system',
            content: 'You are a message router. Answer only yes or no.',
          },
          {
            role: 'user',
            content: `Is the following message directed at or relevant to an NPC named "${agentname}"?${contextsnippet}\nMessage: "${messagetext}"\nAnswer:`,
          },
        ]

        const answer = await modelclassify(classifymessages, onworking)

        if (answer.startsWith('yes')) {
          await runagentprompt(
            message.player,
            agentid,
            agentname,
            messagetext,
            onworking,
          )
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
