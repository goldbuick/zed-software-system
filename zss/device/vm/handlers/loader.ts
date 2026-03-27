import type { DEVICE } from 'zss/device'
import type { MESSAGE, TEXT_READER } from 'zss/device/api'
import { apilog, heavymodelprompt } from 'zss/device/api'
import { lastinputtime } from 'zss/device/vm/state'
import { parsewebfile } from 'zss/feature/parse/file'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memoryreadobject } from 'zss/memory/boardaccess'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import { memoryreadflags } from 'zss/memory/flags'
import { memoryloader } from 'zss/memory/loader'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware, memorywritebook } from 'zss/memory/session'
import {
  memorylistboardnamedelements,
  memorypickboardnearestpt,
} from 'zss/memory/spatialqueries'
import { BOARD, BOARD_ELEMENT, MEMORY_LABEL } from 'zss/memory/types'
import { memoryreadconfig } from 'zss/memory/utilities'

function playerisagent(playerid: string): boolean {
  return memoryreadflags(playerid).agent === 1
}

function playerdisplayname(playerid: string): string {
  const s = maptostring(memoryreadflags(playerid).user)
  return s || playerid
}

function boardagentelements(board: BOARD, boardid: string): BOARD_ELEMENT[] {
  const players = memorylistboardnamedelements(board, 'player')
  const out: BOARD_ELEMENT[] = []
  for (let i = 0; i < players.length; ++i) {
    const el = players[i]
    const pid = el.id
    if (!isstring(pid) || !playerisagent(pid)) {
      continue
    }
    const agentboard = memoryreadplayerboard(pid)
    if (!ispresent(agentboard) || agentboard.id !== boardid) {
      continue
    }
    out.push(el)
  }
  return out
}

function boardnearestagentref(
  board: BOARD,
  boardid: string,
  messageplayer: string,
  sendername: string,
): { id: string; name: string } | undefined {
  const senderelement = memoryreadobject(board, messageplayer)
  if (!ispresent(senderelement)) {
    return undefined
  }
  const senderpt = { x: senderelement.x ?? 0, y: senderelement.y ?? 0 }
  const candidates = boardagentelements(board, boardid)
  const agentelements: BOARD_ELEMENT[] = []
  for (let i = 0; i < candidates.length; ++i) {
    const el = candidates[i]
    const agentid = el.id
    if (!isstring(agentid)) {
      continue
    }
    if (
      agentid === messageplayer ||
      playerdisplayname(agentid) === sendername
    ) {
      continue
    }
    agentelements.push(el)
  }
  const nearest = memorypickboardnearestpt(senderpt, agentelements)
  const nearestid = nearest?.id
  if (!ispresent(nearest) || !isstring(nearestid)) {
    return undefined
  }
  return { id: nearestid, name: playerdisplayname(nearestid) }
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
  const prompt = chatline.slice(colonidx + 1)

  const board = memoryreadboardbyaddress(boardid)
  if (!ispresent(board)) {
    return
  }

  const nearestref = boardnearestagentref(
    board,
    boardid,
    message.player,
    sendername,
  )
  const nearestrefid = nearestref?.id ?? ''
  const nearestrefname = nearestref?.name ?? ''

  const defaulttime = new Date('2000-01-01').getTime()
  const allagents = boardagentelements(board, boardid)
  for (let i = 0; i < allagents.length; ++i) {
    const agent = allagents[i]
    const agentid = agent.id
    if (!isstring(agentid)) {
      continue
    }

    const agentname = playerdisplayname(agentid)
    if (agentid === message.player || sendername === agentname) {
      continue
    }

    const withlastinputtime = lastinputtime[agentid] ?? defaulttime
    const withpromptlogging = memoryreadconfig('promptlogging')

    heavymodelprompt(vm, message.player, {
      prompt,
      agentid,
      agentname,
      nearestrefid,
      nearestrefname,
      lastinputtime: withlastinputtime,
      promptlogging: withpromptlogging,
    })
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
