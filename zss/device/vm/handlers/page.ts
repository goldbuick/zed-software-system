import type { DEVICE } from 'zss/device'
import { apitoast } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { ispresent } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import {
  memorycodepagetypetostring,
  memorycreatecodepage,
  memoryreadcodepagename,
  memoryreadcodepagetype,
} from 'zss/memory/codepageoperations'
import {
  memoryreadmainbook,
  memoryreadoperator,
  memorywritefrozen,
} from 'zss/memory/session'
export function handlepage(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  const mainbook = memoryreadmainbook()
  if (!ispresent(mainbook) || message.player !== operator) {
    return
  }
  memorywritefrozen(true)
  try {
    const { code, ...content } = message.data
    const codepage = memorycreatecodepage(code, content)
    const name = memoryreadcodepagename(codepage)
    const type = memoryreadcodepagetype(codepage)
    const typestr = memorycodepagetypetostring(type)
    memorywritecodepage(mainbook, codepage)
    apitoast(vm, message.player, `wrote $green@${typestr} ${name} to main book`)
  } finally {
    memorywritefrozen(false)
  }
}
