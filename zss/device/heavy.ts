import { Message } from '@huggingface/transformers'
import { createdevice } from 'zss/device'
import {
  formatagentinfofortext,
  formatboardfortext,
  formatpathfindfortext,
  formatsystemprompt,
  readcodepagefortext,
} from 'zss/feature/heavy/formatstate'
import {
  TOOL_CALL,
  destroysharedmodel,
  modelclassify,
  modelgenerate,
} from 'zss/feature/heavy/model'
import { requestaudiobytes, requestinfo } from 'zss/feature/heavy/tts'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { doasync } from 'zss/mapping/func'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

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

function parseinputmods(tokens: string[]): number {
  let bits = 0
  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i].trim().toLowerCase()
    if (token === 'alt') {
      bits |= INPUT_ALT
    }
    if (token === 'ctrl') {
      bits |= INPUT_CTRL
    }
    if (token === 'shift') {
      bits |= INPUT_SHIFT
    }
  }
  return bits
}

function executetoolcalls(
  player: string,
  agentid: string,
  agentname: string,
  toolcalls: TOOL_CALL[],
): MAYBE<string>[] {
  const results: MAYBE<string>[] = []

  for (let i = 0; i < toolcalls.length; ++i) {
    const call = toolcalls[i]
    switch (call.name) {
      case 'set_agent_name':
        if (isstring(call.args.name)) {
          heavy.emit(player, 'vm:agentname', [agentid, NAME(call.args.name)])
        }
        results.push(undefined)
        break

      case 'get_agent_info':
        results.push(formatagentinfofortext(agentid, agentname))
        break

      case 'look_at_board':
        results.push(formatboardfortext(agentid))
        break

      case 'run_command':
        if (isstring(call.args.command)) {
          heavy.emit(player, 'vm:cli', call.args.command)
        }
        results.push(undefined)
        break

      case 'read_codepage':
        if (isstring(call.args.name)) {
          results.push(readcodepagefortext(call.args.name, call.args.type))
        } else {
          results.push('Missing codepage name.')
        }
        break

      case 'pathfind': {
        const tx = parseFloat(String(call.args.target_x))
        const ty = parseFloat(String(call.args.target_y))
        if (isnumber(tx) && isnumber(ty)) {
          const flee = call.args.flee === 'true'
          results.push(formatpathfindfortext(agentid, tx, ty, flee))
        } else {
          results.push('Invalid target coordinates.')
        }
        break
      }

      case 'press_input':
        if (isstring(call.args.inputs)) {
          const tokens = call.args.inputs.split(',')
          const modbits = parseinputmods(tokens)
          for (let ii = 0; ii < tokens.length; ++ii) {
            const token = tokens[ii].trim().toLowerCase()
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
        results.push(undefined)
        break

      default:
        results.push(undefined)
        break
    }
  }

  return results
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

  const systemprompt = formatsystemprompt(agentname, agentid)

  for (let iteration = 0; iteration < MAX_REPROMPT; ++iteration) {
    const result = await modelgenerate(systemprompt, history, onworking)

    if (result.toolcalls.length === 0) {
      const reply = isstring(result.text) ? result.text : ''
      if (reply) {
        history.push({ role: 'assistant', content: reply })
        agenthistories[agentid] = history
        apilog(heavy, player, '$21', reply)
        heavy.emit(player, 'vm:agentresponse', [agentid, reply])
      }
      return
    }

    const toolresults = executetoolcalls(
      player,
      agentid,
      agentname,
      result.toolcalls,
    )

    history.push({ role: 'assistant', content: result.text || '(tool calls)' })
    agenthistories[agentid] = history

    let hasdataresults = false
    for (let i = 0; i < toolresults.length; ++i) {
      if (ispresent(toolresults[i])) {
        hasdataresults = true
        history.push({
          role: 'user',
          content: `[tool result] ${toolresults[i]}`,
        })
      }
    }

    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY)
    }
    agenthistories[agentid] = history

    if (!hasdataresults) {
      const reply = isstring(result.text) ? result.text : ''
      if (reply) {
        apilog(heavy, player, '$21', reply)
        heavy.emit(player, 'vm:agentresponse', [agentid, reply])
      }
      return
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
