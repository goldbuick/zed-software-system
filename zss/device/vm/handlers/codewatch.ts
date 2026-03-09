import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmcodeaddress } from 'zss/device/api'
import { modemobservevaluestring } from 'zss/device/modem'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardoperations'
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

import { observers, watching } from '../state'

export function handlecodewatch(_vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [book, path] = message.data
  const address = vmcodeaddress(book, path)
  if (!ispresent(observers[address])) {
    observers[address] = modemobservevaluestring(address, (value) => {
      const [codepage, maybeobject] = path
      const contentbook = memoryreadbookbyaddress(book)
      const content = memoryreadcodepage(contentbook, codepage)
      if (ispresent(content)) {
        if (
          memoryreadcodepagetype(content) === CODE_PAGE_TYPE.BOARD &&
          ispresent(maybeobject)
        ) {
          const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(content)
          const object = memoryreadobject(board, maybeobject)
          if (ispresent(object)) {
            object.code = value
            memoryapplyelementstats(
              memoryreadcodepagestatsfromtext(value),
              object,
            )
          }
        } else {
          content.code = value
          memoryresetcodepagestats(content)
        }
      }
    })
  }
  watching[address] = watching[address] ?? new Set()
  watching[address].add(message.player)
}

export function handlecoderelease(_vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [book, path] = message.data
  const [, maybeobject] = path
  const address = vmcodeaddress(book, path)
  if (ispresent(watching[address])) {
    watching[address].delete(message.player)
    if (watching[address].size === 0) {
      observers[address]?.()
      observers[address] = undefined
      if (isstring(maybeobject)) {
        memoryhaltchip(maybeobject)
      }
    }
  }
}
