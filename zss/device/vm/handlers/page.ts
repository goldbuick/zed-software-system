import type { DEVICE } from 'zss/device'
import { type MESSAGE, apitoast } from 'zss/device/api'
import { ispresent } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import {
  memorycodepagetypetostring,
  memorycreatecodepage,
  memoryreadcodepagename,
  memoryreadcodepagetype,
} from 'zss/memory/codepageoperations'
import {
  memoryreadbookbysoftware,
  memoryreadoperator,
  memorywritefreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

export function handlepage(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook) || message.player !== operator) {
    return
  }
  memorywritefreeze(true)
  try {
    const { code, ...content } = message.data
    const codepage = memorycreatecodepage(code, content)
    const name = memoryreadcodepagename(codepage)
    const type = memoryreadcodepagetype(codepage)
    const typestr = memorycodepagetypetostring(type)
    memorywritecodepage(mainbook, codepage)
    apitoast(vm, message.player, `wrote $green@${typestr} ${name} to main book`)
  } finally {
    memorywritefreeze(false)
  }
}
