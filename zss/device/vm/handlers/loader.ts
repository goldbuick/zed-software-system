import type { DEVICE } from 'zss/device'
import type { MESSAGE, TEXT_READER } from 'zss/device/api'
import { apilog, heavymodelclassify, heavymodelprompt } from 'zss/device/api'
import { readagentname } from 'zss/device/vm/handlers/agent'
import {
  ATTENTION_WINDOW_MS,
  agentlastresponse,
  agents,
} from 'zss/device/vm/state'
import { parsewebfile } from 'zss/feature/parse/file'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardoperations'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import { memoryloader } from 'zss/memory/loader'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware, memorywritebook } from 'zss/memory/session'
import { memorypickboardnearestpt } from 'zss/memory/spatialqueries'
import { MEMORY_LABEL } from 'zss/memory/types'
import { memoryreadconfig } from 'zss/memory/utilities'

const GENERIC_AGENT_PHRASES = [
  /\bhey\s+agent\b/i,
  /\bhi\s+agent\b/i,
  /\bhello\s+agent\b/i,
  /\byo\s+agent\b/i,
  /\bagent\s+what\b/i,
  /\bagent\s+what'?s\b/i,
  /\bagent\s*,\s*what\b/i,
]

function genericphrasematches(messagetext: string): boolean {
  const normalized = messagetext.trim().toLowerCase()
  for (let i = 0; i < GENERIC_AGENT_PHRASES.length; ++i) {
    if (GENERIC_AGENT_PHRASES[i].test(normalized)) {
      return true
    }
  }
  return false
}

function namematches(agentname: string, message: string): boolean {
  const words = agentname.split(/[-\s]+/)
  for (let i = 0; i < words.length; ++i) {
    const pattern = new RegExp('\\b' + words[i] + '\\b', 'i')
    if (pattern.test(message)) {
      return true
    }
  }
  return false
}

function routechattoagents(
  vm: DEVICE,
  message: MESSAGE,
  eventname: string,
  content: TEXT_READER,
): void {
  const boardid = eventname.slice('chat:message:'.length)
  if (!boardid) {
    return
  }

  const chatline = content.lines[0]
  if (!isstring(chatline)) {
    return
  }

  const colonidx = chatline.indexOf(':')
  if (colonidx < 0) {
    return
  }

  const sendername = chatline.slice(0, colonidx)
  const messagetext = chatline.slice(colonidx + 1)
  const now = Date.now()

  if (genericphrasematches(messagetext)) {
    const board = memoryreadboardbyaddress(boardid)
    if (!ispresent(board)) {
      return
    }
    const senderelement = memoryreadobject(board, message.player)
    if (!ispresent(senderelement)) {
      return
    }
    const senderpt = { x: senderelement.x ?? 0, y: senderelement.y ?? 0 }
    const agentlist = Object.values(agents)
    const agentelements: (typeof senderelement)[] = []
    for (let i = 0; i < agentlist.length; ++i) {
      const agent = agentlist[i]
      if (readagentname(agent.id()) === sendername) {
        continue
      }
      const agentboard = memoryreadplayerboard(agent.id())
      if (!ispresent(agentboard) || agentboard.id !== boardid) {
        continue
      }
      const el = memoryreadobject(board, agent.id())
      if (ispresent(el)) {
        agentelements.push(el)
      }
    }
    const nearest = memorypickboardnearestpt(senderpt, agentelements)
    const nearestid = nearest?.id
    if (ispresent(nearest) && isstring(nearestid)) {
      const agent = agents[nearestid]
      if (ispresent(agent)) {
        heavymodelprompt(
          vm,
          message.player,
          nearestid,
          readagentname(nearestid),
          messagetext,
        )
      }
    }
    return
  }

  const agentlist = Object.values(agents)
  for (let i = 0; i < agentlist.length; ++i) {
    const agent = agentlist[i]

    if (sendername === readagentname(agent.id())) {
      continue
    }

    const agentboard = memoryreadplayerboard(agent.id())
    if (!ispresent(agentboard) || agentboard.id !== boardid) {
      continue
    }

    const lastresponse = agentlastresponse[agent.id()] ?? 0
    const hasattention = now - lastresponse < ATTENTION_WINDOW_MS

    const name = readagentname(agent.id())
    if (hasattention || namematches(name, messagetext)) {
      heavymodelprompt(
        vm,
        message.player,
        agent.id(),
        name,
        messagetext,
      )
    } else {
      heavymodelclassify(
        vm,
        message.player,
        agent.id(),
        name,
        messagetext,
      )
    }
  }
}

export function handleloader(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [arg, format, eventname, content] = message.data
  if (memoryreadconfig('loaderlogging') === 'on') {
    console.info('loader event', eventname, format, arg, content)
    apilog(vm, message.player, `loader event ${eventname} ${format}`)
  }
  switch (format) {
    case 'file':
      parsewebfile(message.player, content)
      break
    case 'json':
      if (/file:.*\.book.json/.test(eventname)) {
        apilog(vm, message.player, `loading ${eventname}`)
        const json = JSON.parse(content.json)
        if (ispresent(json.data) && isstring(json.exported)) {
          memorywritebook(json.data)
          apilog(vm, message.player, `loaded ${json.exported}`)
        }
      } else if (/file:.*\..*\.codepage.json/.test(eventname)) {
        apilog(vm, message.player, `loading ${eventname}`)
        const json = JSON.parse(content.json)
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        if (
          ispresent(mainbook) &&
          ispresent(json.data) &&
          isstring(json.exported)
        ) {
          memorywritecodepage(mainbook, json.data)
          apilog(vm, message.player, `loaded ${json.exported}`)
        }
      } else {
        memoryloader(arg, format, eventname, content, message.player)
      }
      break
    default:
      memoryloader(arg, format, eventname, content, message.player)
      break
  }

  if (
    isstring(eventname) &&
    eventname.startsWith('chat:message:') &&
    format === 'text'
  ) {
    routechattoagents(vm, message, eventname, content as TEXT_READER)
  }
}
