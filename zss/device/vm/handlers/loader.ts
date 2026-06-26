import type { DEVICE } from 'zss/device'
import type { MESSAGE, TEXT_READER } from 'zss/device/api'
import { apilog, heavymodelprompt } from 'zss/device/api'
import { parsewebfile } from 'zss/feature/parse/file'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import {
  memoryimportbookfromjson,
  memorywritecodepage,
} from 'zss/memory/bookoperations'
import { memoryimportcodepagefromjson } from 'zss/memory/codepageoperations'
import { memoryloader } from 'zss/memory/loader'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import {
  memoryreadbookbysoftware,
  memoryreadoperator,
  memorywritebook,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { memoryreadconfig } from 'zss/memory/utilities'

function iscodepagejsonfile(eventname: string) {
  return (
    /file:.*\..*\.codepage\.json/.test(eventname) ||
    /file:.*\.(board|object|terrain|charset|palette|loader)\.json/.test(
      eventname,
    )
  )
}

function routechattoagent(
  vm: DEVICE,
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

  const prompt = chatline.slice(colonidx + 1)

  const board = memoryreadboardbyaddress(boardid)
  if (!ispresent(board)) {
    return
  }

  const operator = memoryreadoperator()
  const operatorboard = memoryreadplayerboard(operator)
  if (!ispresent(operatorboard) || operatorboard.id !== boardid) {
    return
  }

  const withpromptlogging = memoryreadconfig('promptlogging')
  heavymodelprompt(vm, operator, {
    prompt,
    promptlogging: withpromptlogging,
  })
}

export function handleloader(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [arg, format, eventname, content] = message.data
  if (memoryreadconfig('loaderlogging') === 'on') {
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
          const book = memoryimportbookfromjson(json.data)
          if (ispresent(book)) {
            memorywritebook(book)
            apilog(vm, message.player, `loaded ${json.exported}`)
          }
        }
      } else if (iscodepagejsonfile(eventname)) {
        apilog(vm, message.player, `loading ${eventname}`)
        const json = JSON.parse(content.json)
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        if (
          ispresent(mainbook) &&
          ispresent(json.data) &&
          isstring(json.exported)
        ) {
          const codepage = memoryimportcodepagefromjson(json.data)
          if (ispresent(codepage)) {
            memorywritecodepage(mainbook, codepage)
            apilog(vm, message.player, `loaded ${json.exported}`)
          }
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
    routechattoagent(vm, eventname, content as TEXT_READER)
  }
}
