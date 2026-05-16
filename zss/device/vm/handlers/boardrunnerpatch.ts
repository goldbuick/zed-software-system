import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunnerpaint } from 'zss/device/api'
import { boardrunnerboundarypatch } from 'zss/device/vm/boardrunnerboundarysync'
import { boardrunnermemorypatch } from 'zss/device/vm/boardrunnermemorysync'
import type { Operation } from 'zss/feature/jsonpipe/observe'
import { isarray, ispresent } from 'zss/mapping/types'
import { memoryboundaryget } from 'zss/memory/boundaries'

export function handleboardrunnerpatch(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  // we need to afford board runners to patch MAIN MEMORY
  const [operations, boundary] = message.data as [
    Operation[],
    string | undefined,
  ]
  if (!boundary) {
    if (!boardrunnermemorypatch(operations)) {
      // ignore sending a reset for now
    } else {
      // emit patch to other board runners
      boardrunnermemorypatch(operations)
    }
  } else if (!boardrunnerboundarypatch(boundary, operations)) {
    // send reset to the boundary
    // const doc = memoryboundaryget(boundary)
    // if (ispresent(doc)) {
    //   boardrunnerpaint(vm, message.player, doc, boundary)
    // }
  }
  // NOTE: we keep getting multiple books when saving??
  // consider books: Record<string, BOOK> id => BOOK
  // with pages: Record<string, PAGE> id => PAGE
}
