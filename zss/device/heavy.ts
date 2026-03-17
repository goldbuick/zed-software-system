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

const MAX_REPROMPT = 5
const activeagents = new Set<string>()

async function executeclicommands(
  player: string,
  agentid: string,
  commands: string[],
  promptloggingenabled: boolean,
): Promise<void> {
  for (let i = 0; i < commands.length; ++i) {
    if (commands[i].startsWith('#') || commands[i].startsWith('!')) {
      apilog(heavy, player, '$22 command $7', commands[i])
    }
    if (promptloggingenabled) {
      console.info(
        '%c[heavy] executing command:\n%c%s',
        'color: purple; font-weight: bold',
        'color: green',
        commands[i],
      )
    }
    await memoryquery(heavy, agentid, {
      type: 'runcli',
      command: commands[i],
    })
  }
}

function splitresponse(text: string): string[] {
  const lines = text.split('\n')
  const commands: string[] = []
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim()
    if (line.startsWith('[') && line.endsWith(']')) {
      continue
    }
    if (line.startsWith('#') || line.startsWith('!')) {
      commands.push(line)
    } else if (line) {
      commands.push(`"${line}`)
    }
  }
  return commands
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
  const promptloggingenabled = promptlogging === 'on'
  activeagents.add(agentid)
  const history: Message[] = [{ role: 'user', content: prompt }]

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

    result = await modelgenerate(
      systemprompt,
      history,
      onworking,
      promptloggingenabled,
    )
    if (promptloggingenabled) {
      console.info(
        '%c[heavy] generated response:\n%c%s',
        'color: purple; font-weight: bold',
        'color: orange',
        result.text,
      )
    }

    history.push({ role: 'assistant', content: result.text })
    const commands = splitresponse(result.text)
    const hascontinue = commands.some((line) => line.trim() === '#continue')
    const execcommands = commands.filter((line) => line.trim() !== '#continue')

    if (execcommands.length === 0 && !hascontinue) {
      break
    }

    await executeclicommands(
      player,
      agentid,
      execcommands,
      promptloggingenabled,
    )

    const executed = execcommands.join('\n')
    history.push({
      role: 'user',
      content: `[EXECUTED]\n${executed}\n[/EXECUTED]\n`,
    })

    if (!hascontinue) {
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

        const classifymessages: Message[] = [
          {
            role: 'system',
            content:
              'You are a message classifier. Answer with exactly one word: movement, action, question, chat, or none.',
          },
          {
            role: 'user',
            content: `Is the following message directed at or relevant to an ai agent named "${agentname}"? If not, answer "none". Otherwise classify the intent as: movement (go, walk, follow, come here, directions), action (shoot, create, change, interact), question (asking about something), or chat (conversation).\nMessage: "${messagetext}"\nAnswer:`,
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
        activeagents.delete(message.data)
        if (activeagents.size === 0) {
          destroysharedmodel()
        }
      }
      break
    case 'pilotnotify':
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
