import { Message } from '@huggingface/transformers'
import { createdevice } from 'zss/device'
import {
  heavyrunagentlist,
  heavyrunagentname,
  heavyrunagentstart,
  heavyrunagentstop,
  heavyrunrestoreagents,
  heavyrunsyncuserdisplay,
} from 'zss/feature/heavy/agentlifecycle'
import {
  formatagentinfofortext,
  formatboardfortext,
  stripzsstextcodesforllm,
} from 'zss/feature/heavy/formatstate'
import { enqueueheavyjob } from 'zss/feature/heavy/heavyjobqueue'
import {
  type HEAVY_LLM_PRESET,
  heavyllmpresetbackend,
  normalizeheavylmpreset,
} from 'zss/feature/heavy/heavyllmpreset'
import { RUN_ZSS_COMMAND_TOOL_NAME } from 'zss/feature/heavy/llm/agenttools'
import type { MODEL_RESULT } from 'zss/feature/heavy/model'
import {
  applyheavylmpreset,
  destroysharedmodel,
  getheavylmeffectivepreset,
  modelclassify,
  modelgenerate,
  modelgenerategemma4,
} from 'zss/feature/heavy/model'
import {
  buildsystemprompt,
  buildsystempromptgemma,
} from 'zss/feature/heavy/prompt'
import { requestaudiobytes, requestinfo } from 'zss/feature/heavy/tts'
import {
  query as memoryquery,
  resolvemessage as memoryqueryresolvemessage,
} from 'zss/feature/heavy/vmquery'
import { resolvestoragepullmessage } from 'zss/feature/storagepull'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { apierror, apilog, apitoast, vmlastinputtouch } from './api'

const MAX_REPROMPT = 5
const activeagents = new Set<string>()

type Agenthistorymessage = Message & { name?: string }

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

async function classifythenmaybeagentprompt(
  player: string,
  messagetext: string,
  agentid: string,
  agentname: string,
  nearestrefid: string,
  nearestrefname: string,
  promptlogging: string,
) {
  const onworking = createonworking(player)
  const nearestcontext = nearestrefid
    ? `Proximity reference: the agent closest to the message sender on this board is "${nearestrefname}" (id: ${nearestrefid}). Use this when the message is vague (e.g. addressing "agent" or "you") to infer who is likely meant, but still answer "none" if the message clearly targets a different agent.\n\n`
    : 'No nearest-agent proximity reference is available.\n\n'

  const classifymessages: Message[] = [
    {
      role: 'system',
      content:
        'You are a message classifier. Answer with exactly one word: movement, action, question, chat, or none.',
    },
    {
      role: 'user',
      content: `${nearestcontext}Is the following message directed at or relevant to the ai agent named "${agentname}" (id: ${agentid})? If not, answer "none". Otherwise classify the intent as: movement (go, walk, follow, come here, directions), action (shoot, create, change, interact), question (asking about something), or chat (conversation).\nMessage: "${messagetext}"\nAnswer:`,
    },
  ]

  const answer = await modelclassify(classifymessages, onworking)
  const intent = answer.split(/\s+/)[0] ?? ''

  if (intent !== 'none') {
    await runagentprompt(
      player,
      agentid,
      agentname,
      messagetext,
      onworking,
      promptlogging,
      intent,
    )
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
      context: stripzsstextcodesforllm(formatboardfortext(boarddata)),
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
  const history: Agenthistorymessage[] = [{ role: 'user', content: prompt }]
  const usegemma =
    heavyllmpresetbackend(getheavylmeffectivepreset()) === 'gemma4'

  apilog(heavy, player, '$21 input $7', prompt)

  try {
    let result!: MODEL_RESULT
    for (let iteration = 0; iteration < MAX_REPROMPT; ++iteration) {
      const { context, agentinfo } = await queryboardstate(agentid, agentname)

      if (usegemma) {
        const systemprompt = buildsystempromptgemma(
          agentname,
          agentinfo,
          context,
          intent,
        )
        const g = await modelgenerategemma4(
          systemprompt,
          history,
          onworking,
          promptloggingenabled,
        )
        if (promptloggingenabled) {
          console.info(
            '%c[heavy] generated response (gemma):\n%c%s',
            'color: purple; font-weight: bold',
            'color: orange',
            g.toolcommandlines.length > 0 ? g.raw : g.text,
          )
        }

        if (g.toolcommandlines.length > 0) {
          history.push({ role: 'assistant', content: g.raw })
          const hascontinue = g.toolcommandlines.some(
            (line) => line.trim() === '#continue',
          )
          const execcommands = g.toolcommandlines.filter(
            (line) => line.trim() !== '#continue',
          )
          if (execcommands.length > 0) {
            await executeclicommands(
              player,
              agentid,
              execcommands,
              promptloggingenabled,
            )
          }
          history.push({
            role: 'tool',
            name: RUN_ZSS_COMMAND_TOOL_NAME,
            content: JSON.stringify({
              ok: true,
              executed:
                execcommands.length > 0
                  ? execcommands.join('\n')
                  : '(#continue)',
            }),
          })
          if (!hascontinue) {
            break
          }
          continue
        }

        history.push({
          role: 'assistant',
          content: g.text || g.raw,
        })
        break
      }

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
      const execcommands = commands.filter(
        (line) => line.trim() !== '#continue',
      )

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
  } finally {
    vmlastinputtouch(heavy, player, agentid)
  }
}

const heavy = createdevice('heavy', [], (message) => {
  if (!heavy.session(message)) {
    return
  }
  switch (message.target) {
    case 'ttsinfo':
      enqueueheavyjob(heavy, message.player, async () => {
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
      enqueueheavyjob(heavy, message.player, async () => {
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
      enqueueheavyjob(heavy, message.player, async () => {
        if (!isarray(message.data) || message.data.length < 7) {
          return
        }
        const d = message.data
        const prompt = d[0]
        const agentid = d[1]
        const agentname = d[2]
        const nearestrefid = isstring(d[4]) ? d[4] : ''
        const nearestrefname = isstring(d[5]) ? d[5] : ''
        const promptlogging = isstring(d[6]) ? d[6] : ''
        if (!isstring(prompt) || !isstring(agentid) || !isstring(agentname)) {
          return
        }
        apitoast(heavy, message.player, `${agentname} is thinking...`)
        await classifythenmaybeagentprompt(
          message.player,
          prompt,
          agentid,
          agentname,
          nearestrefid,
          nearestrefname,
          promptlogging,
        )
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
    case 'llmpreset': {
      let preset: HEAVY_LLM_PRESET | undefined
      let showtoast = true
      if (isstring(message.data)) {
        preset = normalizeheavylmpreset(message.data)
      } else if (isarray(message.data) && message.data.length >= 1) {
        const raw = message.data[0]
        if (isstring(raw)) {
          preset = normalizeheavylmpreset(raw)
        }
        if (message.data[1] === false) {
          showtoast = false
        }
      }
      if (!preset) {
        break
      }
      const applied = preset
      const toast = showtoast
      enqueueheavyjob(heavy, message.player, () => {
        applyheavylmpreset(applied)
        if (toast) {
          apitoast(heavy, message.player, `heavy llm: ${applied}`)
        }
        return Promise.resolve()
      })
      break
    }
    case 'pilotnotify':
      break
    case 'queryresult':
      memoryqueryresolvemessage(message)
      break
    case 'pullvarresult':
      resolvestoragepullmessage(message.data)
      break
    case 'agentstart':
      heavyrunagentstart(heavy, message)
      break
    case 'agentstop':
      heavyrunagentstop(heavy, message)
      break
    case 'agentlist':
      heavyrunagentlist(heavy, message)
      break
    case 'agentname':
      heavyrunagentname(heavy, message)
      break
    case 'syncuserdisplay':
      heavyrunsyncuserdisplay(heavy, message)
      break
    case 'restoreagents':
      heavyrunrestoreagents(heavy, message)
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
