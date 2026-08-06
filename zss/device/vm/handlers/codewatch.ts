import type { DEVICE } from 'zss/device'
import { boardrunnerhaltchip, vmcodeaddress } from 'zss/device/api'
import { modemreadtextsync } from 'zss/device/modem'
import type { MESSAGE } from 'zss/device/types'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import { boardrunners, observers, watching } from 'zss/device/vm/state'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardaccess'
import { memoryreadcodepage } from 'zss/memory/bookoperations'
import {
  memoryapplyelementstats,
  memoryreadcodepagedata,
  memoryreadcodepagestatsfromtext,
  memoryreadcodepagetype,
  memoryresetcodepagestats,
} from 'zss/memory/codepageoperations'
import { memoryhaltchip } from 'zss/memory/runtime'
import { memoryreadbookbyaddress } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

function applymodemcodetomemory(
  book: string,
  path: unknown,
  value: string,
): void {
  if (!isarray(path)) {
    return
  }
  const [codepage, maybeobject] = path
  const contentbook = memoryreadbookbyaddress(book)
  const content = memoryreadcodepage(contentbook, codepage)
  if (!ispresent(content)) {
    return
  }
  if (
    memoryreadcodepagetype(content) === CODE_PAGE_TYPE.BOARD &&
    ispresent(maybeobject)
  ) {
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(content)
    const object = memoryreadobject(board, maybeobject)
    if (ispresent(object)) {
      object.code = value
      memoryapplyelementstats(memoryreadcodepagestatsfromtext(value), object)
    }
    return
  }
  content.code = value
  memoryresetcodepagestats(content)
}

export function handlecodewatch(vm: DEVICE, message: MESSAGE): void {
  void vm
  if (!isarray(message.data)) {
    return
  }
  const [book, path] = message.data
  const address = vmcodeaddress(book, path)
  // Typing stays in the modem buffer; MEMORY is applied on last coderelease.
  watching[address] = watching[address] ?? new Set()
  watching[address].add(message.player)
}

export function handlecoderelease(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [book, path] = message.data
  const [boardcodepage, maybeobject] = path
  const address = vmcodeaddress(book, path)
  if (ispresent(watching[address])) {
    watching[address].delete(message.player)
    if (watching[address].size === 0) {
      applymodemcodetomemory(book, path, modemreadtextsync(address))
      observers[address]?.()
      observers[address] = undefined
      const boardid = isstring(boardcodepage) ? boardcodepage : ''
      const runner = boardid ? boardrunners[boardid] : undefined
      if (isstring(maybeobject)) {
        memoryhaltchip(maybeobject)
      }
      // Editor closed: flush page.code to boardrunners before CLI #put / tick.
      boardrunnerpushupdates(vm)
      // Chips live on the elected runner, so the halt above is a no-op for board
      // objects. Drop it there too -- after the flush, so the rebuild on the next
      // tick picks up the patched code rather than re-caching the old build.
      if (isstring(maybeobject) && isstring(runner)) {
        boardrunnerhaltchip(vm, runner, maybeobject)
      }
    }
  }
}
