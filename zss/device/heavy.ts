import { Message } from '@huggingface/transformers'
import { createdevice } from 'zss/device'
import {
  formatagentinfofortext,
  formatboardfortext,
} from 'zss/feature/heavy/formatstate'
import {
  query as memoryquery,
  resolvemessage as memoryqueryresolvemessage,
} from 'zss/feature/heavy/memoryquery'
import type { MODEL_RESULT } from 'zss/feature/heavy/model'
import {
  destroysharedmodel,
  modelclassify,
  modelgenerate,
} from 'zss/feature/heavy/model'
import { buildsystemprompt } from 'zss/feature/heavy/prompt'
import { requestaudiobytes, requestinfo } from 'zss/feature/heavy/tts'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadconfig } from 'zss/memory/utilities'

import { apierror, apilog, apitoast } from './api'

const MAX_HISTORY = 40
const MAX_REPROMPT = 3
const MAX_CLASSIFY_CONTEXT = 3
const agenthistories: Record<string, Message[]> = {}

const INPUT_MAP: Record<string, INPUT> = {
  up: INPUT.MOVE_UP,
  down: INPUT.MOVE_DOWN,
  left: INPUT.MOVE_LEFT,
  right: INPUT.MOVE_RIGHT,
  ok: INPUT.OK_BUTTON,
  cancel: INPUT.CANCEL_BUTTON,
  menu: INPUT.MENU_BUTTON,
  alt: INPUT.ALT,
  ctrl: INPUT.CTRL,
  shift: INPUT.SHIFT,
}

function executeinput(player: string, line: string) {
  const tokens = line
    .replace(/^#input\s+/i, '')
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  let modbits = 0
  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i]
    if (token === 'alt') {
      modbits |= INPUT_ALT
    }
    if (token === 'ctrl') {
      modbits |= INPUT_CTRL
    }
    if (token === 'shift') {
      modbits |= INPUT_SHIFT
    }
  }

  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i]
    const input = INPUT_MAP[token]
    if (
      ispresent(input) &&
      input !== INPUT.ALT &&
      input !== INPUT.CTRL &&
      input !== INPUT.SHIFT
    ) {
      heavy.emit(player, 'vm:input', [input, modbits])
    }
  }
}

async function executeclicommands(
  agentid: string,
  commands: string[],
): Promise<void> {
  for (let i = 0; i < commands.length; ++i) {
    const line = commands[i]
    if (/^#input\s/i.test(line)) {
      executeinput(agentid, line)
    } else {
      await memoryquery(heavy, agentid, {
        type: 'runcli',
        command: line,
      })
    }
  }
}

function splitresponse(text: string): { reply: string; commands: string[] } {
  const lines = text.split('\n')
  const replylines: string[] = []
  const commands: string[] = []
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim()
    if (line.startsWith('#')) {
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
    const systemprompt = buildsystemprompt(agentname, agentinfo, context)

    if (memoryreadconfig('promptlogging') === 'on') {
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

    history.push({
      role: 'assistant',
      content: result.text,
    })

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
        const [agentid, agentname, prompt] = message.data as [
          string,
          string,
          string,
        ]
        apitoast(heavy, message.player, `${agentname} is thinking...`)
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
            recenthistory.map((m) => `${m.role}: ${m.content}`).join('\n') +
            '\n'
        }

        const classifymessages: Message[] = [
          {
            role: 'system',
            content: 'You are a message router. Answer only yes or no.',
          },
          {
            role: 'user',
            content: `Is the following message directed at or relevant to an ai agent named "${agentname}"?${contextsnippet}\nMessage: "${messagetext}"\nAnswer:`,
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
