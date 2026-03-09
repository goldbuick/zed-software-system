import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import { parsewebfile } from 'zss/feature/parse/file'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import { memoryloader } from 'zss/memory/loader'
import { memoryreadbookbysoftware, memorywritebook } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { memoryreadconfig } from 'zss/memory/utilities'

export function handleLoader(vm: DEVICE, message: MESSAGE): void {
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
}
