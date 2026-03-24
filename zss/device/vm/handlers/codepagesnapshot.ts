import type { DEVICE } from 'zss/device'
import { type MESSAGE, vmcodeaddress } from 'zss/device/api'
import { modemreadcodepagetextifpresent } from 'zss/device/modem'
import { deepcopy, isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardoperations'
import { memoryreadcodepage } from 'zss/memory/bookoperations'
import {
  memoryreadcodepagedata,
  memoryreadcodepagetype,
} from 'zss/memory/codepageoperations'
import { memoryreadbookbyaddress } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

export function handlecodepagesnapshot(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    vm.replynext(message, 'ackcodepagesnapshot', null)
    return
  }
  const [book, path, edtype, edtitle] = message.data as [
    string,
    string[],
    unknown,
    unknown,
  ]
  if (!isstring(book) || !isarray(path)) {
    vm.replynext(message, 'ackcodepagesnapshot', null)
    return
  }
  const codepageid = path[0]
  if (!isstring(codepageid)) {
    vm.replynext(message, 'ackcodepagesnapshot', null)
    return
  }
  const contentbook = memoryreadbookbyaddress(book)
  const cp = memoryreadcodepage(contentbook, codepageid)
  if (!cp) {
    vm.replynext(message, 'ackcodepagesnapshot', null)
    return
  }
  const pathstrs = path.filter(isstring)
  const snap = deepcopy(cp)
  const livecode = modemreadcodepagetextifpresent(vmcodeaddress(book, pathstrs))
  if (livecode !== undefined) {
    if (
      pathstrs.length >= 2 &&
      memoryreadcodepagetype(snap) === CODE_PAGE_TYPE.BOARD &&
      isstring(pathstrs[1])
    ) {
      const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(snap)
      const el = memoryreadobject(board, pathstrs[1])
      if (ispresent(el)) {
        el.code = livecode
      }
    } else {
      snap.code = livecode
    }
  }
  vm.replynext(message, 'ackcodepagesnapshot', {
    book,
    path: pathstrs,
    type: isstring(edtype) ? edtype : '',
    title: isstring(edtitle) ? edtitle : '',
    codepage: snap,
  })
}
