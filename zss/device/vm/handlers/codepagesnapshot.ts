import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { deepcopy, isarray, isstring } from 'zss/mapping/types'
import { memoryreadcodepage } from 'zss/memory/bookoperations'
import { memoryreadbookbyaddress } from 'zss/memory/session'

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
  vm.replynext(message, 'ackcodepagesnapshot', {
    book,
    path: path.filter(isstring),
    type: isstring(edtype) ? edtype : '',
    title: isstring(edtitle) ? edtitle : '',
    codepage: deepcopy(cp),
  })
}
