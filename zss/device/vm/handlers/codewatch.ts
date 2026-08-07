import type { DEVICE } from 'zss/device'
import { boardrunnerhaltchip, vmcodeaddress } from 'zss/device/api'
import { modemobservevaluestring } from 'zss/device/modem'
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

/** Board object element code: defer MEMORY until last coderelease. */
function isdeferredobjectedit(book: string, path: unknown): boolean {
  if (!isarray(path)) {
    return false
  }
  const [codepage, maybeobject] = path
  if (!ispresent(maybeobject)) {
    return false
  }
  const contentbook = memoryreadbookbyaddress(book)
  const content = memoryreadcodepage(contentbook, codepage)
  if (!ispresent(content)) {
    return false
  }
  return memoryreadcodepagetype(content) === CODE_PAGE_TYPE.BOARD
}

export function handlecodewatch(vm: DEVICE, message: MESSAGE): void {
  void vm
  if (!isarray(message.data)) {
    return
  }
  const [book, path] = message.data
  const address = vmcodeaddress(book, path)
  // Codepage edits: live-write MEMORY as modem syncs. Board object element
  // code: defer until last coderelease (avoids thrashing object.code / chips).
  if (!isdeferredobjectedit(book, path) && !ispresent(observers[address])) {
    observers[address] = modemobservevaluestring(address, (value) => {
      applymodemcodetomemory(book, path, value)
    })
  }
  watching[address] = watching[address] ?? new Set()
  watching[address].add(message.player)
}

export function handlecoderelease(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [book, path, code] = message.data
  const [boardcodepage, maybeobject] = path
  const address = vmcodeaddress(book, path)
  if (!ispresent(watching[address])) {
    return
  }

  const deferred = isdeferredobjectedit(book, path)
  // Object edits need the main-thread modem payload; without it leave watching.
  if (deferred && !isstring(code)) {
    return
  }

  watching[address].delete(message.player)
  if (watching[address].size !== 0) {
    return
  }

  if (deferred) {
    // Code payload is read on the main-thread modem at emit time.
    applymodemcodetomemory(book, path, code)
  } else {
    observers[address]?.()
    observers[address] = undefined
  }

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
