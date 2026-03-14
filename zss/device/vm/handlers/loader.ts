import type { DEVICE } from 'zss/device'
import type { MESSAGE, TEXT_READER } from 'zss/device/api'
import { apilog, heavymodelprompt } from 'zss/device/api'
import { agents } from 'zss/device/vm/state'
import { parsewebfile } from 'zss/feature/parse/file'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import { memoryloader } from 'zss/memory/loader'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware, memorywritebook } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { memoryreadconfig } from 'zss/memory/utilities'

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

  const agentlist = Object.values(agents)
  for (let i = 0; i < agentlist.length; ++i) {
    const agent = agentlist[i]

    if (sendername === agent.name()) {
      continue
    }

    const agentboard = memoryreadplayerboard(agent.id())
    if (!ispresent(agentboard) || agentboard.id !== boardid) {
      continue
    }

    if (!messagetext.toLowerCase().includes(agent.name().toLowerCase())) {
      continue
    }

    heavymodelprompt(
      vm,
      message.player,
      agent.id(),
      agent.name(),
      messagetext,
    )
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
