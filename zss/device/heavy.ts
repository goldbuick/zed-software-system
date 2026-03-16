import { Message } from '@huggingface/transformers'
import { createdevice } from 'zss/device'
import {
  formatagentinfofortext,
  formatboardfortext,
} from 'zss/feature/heavy/formatstate'
import type { MODEL_RESULT } from 'zss/feature/heavy/model'
import {
  destroysharedmodel,
  modelclassify,
  modelgenerate,
} from 'zss/feature/heavy/model'
import { buildsystemprompt } from 'zss/feature/heavy/prompt'
import { requestaudiobytes, requestinfo } from 'zss/feature/heavy/tts'
import {
  query as memoryquery,
  resolvemessage as memoryqueryresolvemessage,
} from 'zss/feature/heavy/vmquery'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { apierror, apilog, apitoast } from './api'

const MAX_HISTORY = 40
const MAX_REPROMPT = 3
const MAX_CLASSIFY_CONTEXT = 3
const agenthistories: Record<string, Message[]> = {}

async function executeclicommands(
  agentid: string,
  commands: string[],
): Promise<void> {
  for (let i = 0; i < commands.length; ++i) {
    await memoryquery(heavy, agentid, {
      type: 'runcli',
      command: commands[i],
    })
  }
}

function splitresponse(text: string): { reply: string; commands: string[] } {
  const lines = text.split('\n')
  const replylines: string[] = []
  const commands: string[] = []
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim()
    if (line.startsWith('#') || line.startsWith('!')) {
      commands.push(line)
    } else if (line) {
      replylines.push(line)
    }
  }
  return { reply: replylines.join('\n').trim(), commands }
}

function createonworking(player: string) {
  return (msg: string) => {
    apitoast(heavy, player, msg)
  }
}

async function queryboardstate(
  agentid: string,
  agentname: string,
): Promise<{ context: string; agentinfo: string }> {
  try {
    const data = await memoryquery(heavy, agentid, {
      type: 'boardstate',
    })
    const boarddata = data as Parameters<typeof formatboardfortext>[0]
    return {
      context: formatboardfortext(boarddata),
      agentinfo: formatagentinfofortext(boarddata, agentid, agentname),
    }
  } catch {
    return {
      context: 'You are not on any board.',
      agentinfo: `You are ${agentname} (id: ${agentid}). You are not on any board.`,
    }
  }
}

async function runagentprompt(
  player: string,
  agentid: string,
  agentname: string,
  prompt: string,
  onworking: (msg: string) => void,
  promptlogging: string,
  intent?: string,
) {
  let history: Message[] = agenthistories[agentid] ?? []

  history.push({ role: 'user', content: prompt })
  if (history.length > MAX_HISTORY) {
    history = history.slice(-MAX_HISTORY)
  }
  agenthistories[agentid] = history

  apilog(heavy, player, '$21 input $7', prompt)

  let result!: MODEL_RESULT
  for (let iteration = 0; iteration < MAX_REPROMPT; ++iteration) {
    const { context, agentinfo } = await queryboardstate(agentid, agentname)
    const systemprompt = buildsystemprompt(
      agentname,
      agentinfo,
      context,
      intent,
    )

    if (promptlogging === 'on') {
      console.info(
        `[heavy] system prompt (${history.length} messages):\n`,
        systemprompt,
      )
    }

    result = await modelgenerate(systemprompt, history, onworking)

    const { reply, commands } = splitresponse(result.text)

    if (commands.length === 0) {
      if (reply) {
        history.push({ role: 'assistant', content: reply })
        agenthistories[agentid] = history
        heavy.emit(agentid, 'vm:agentresponse', reply)
      }
      return
    }

    history.push({ role: 'assistant', content: reply })

    await executeclicommands(agentid, commands)

    history.push({
      role: 'user',
      content: `[Commands executed: ${commands.join(', ')}]`,
    })

    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY)
    }
    agenthistories[agentid] = history

    if (reply) {
      heavy.emit(agentid, 'vm:agentresponse', reply)
    }
  }

  const { reply } = splitresponse(result.text)
  if (reply) {
    history.push({ role: 'assistant', content: reply })
    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY)
    }
    agenthistories[agentid] = history
    heavy.emit(agentid, 'vm:agentresponse', reply)
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
        const data = message.data as [string, string, string, string?]
        const [agentid, agentname, prompt] = data
        const promptlogging = data.length >= 4 ? (data[3] ?? '') : ''
        apitoast(heavy, message.player, `${agentname} is thinking...`)
        const onworking = createonworking(message.player)
        await runagentprompt(
          message.player,
          agentid,
          agentname,
          prompt,
          onworking,
          promptlogging,
        )
      })
      break
    case 'modelclassify':
      doasync(heavy, message.player, async () => {
        if (!isarray(message.data) || message.data.length < 3) {
          return
        }
        const data = message.data as [string, string, string, string?]
        const [agentid, agentname, messagetext] = data
        const promptlogging = data.length >= 4 ? (data[3] ?? '') : ''
        const onworking = createonworking(message.player)

        const recenthistory = (agenthistories[agentid] ?? []).slice(
          -MAX_CLASSIFY_CONTEXT,
        )
        let contextsnippet = ''
        if (recenthistory.length > 0) {
          contextsnippet =
            '\nRecent conversation:\n' +
            recenthistory.map((m) => `${m.role}: ${m.content}`).join('\n') +
            '\n'
        }

        const classifymessages: Message[] = [
          {
            role: 'system',
            content:
              'You are a message classifier. Answer with exactly one word: movement, action, question, chat, or none.',
          },
          {
            role: 'user',
            content: `Is the following message directed at or relevant to an ai agent named "${agentname}"? If not, answer "none". Otherwise classify the intent as: movement (go, walk, follow, come here, directions), action (shoot, create, change, interact), question (asking about something), or chat (conversation).${contextsnippet}\nMessage: "${messagetext}"\nAnswer:`,
          },
        ]

        const answer = await modelclassify(classifymessages, onworking)
        const intent = answer.split(/\s+/)[0] ?? ''

        if (intent !== 'none') {
          await runagentprompt(
            message.player,
            agentid,
            agentname,
            messagetext,
            onworking,
            promptlogging,
            intent,
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
    case 'pilotnotify': {
      const notify = message.data as
        | { agentid?: string; message?: string }
        | undefined
      if (
        ispresent(notify) &&
        isstring(notify.agentid) &&
        isstring(notify.message)
      ) {
        const history = agenthistories[notify.agentid]
        if (isarray(history)) {
          history.push({ role: 'user', content: notify.message })
          if (history.length > MAX_HISTORY) {
            agenthistories[notify.agentid] = history.slice(-MAX_HISTORY)
          }
        }
      }
      break
    }
    case 'memoryresult':
      memoryqueryresolvemessage(message)
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
