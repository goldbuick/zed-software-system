import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { isstring } from 'zss/mapping/types'
import { memoryinvalidatedraw } from 'zss/memory/boarddrawdirty'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryinvalidategadgetlayerscacheforboard } from 'zss/memory/rendering'
import { memoryensureboardruntime } from 'zss/memory/runtimeboundary'

export function handlemediaqueuenowplaying(
  _vm: DEVICE,
  message: MESSAGE,
): void {
  void _vm
  const data = message.data as
    | { boardid?: unknown; title?: unknown; action?: unknown }
    | undefined
  const boardid = isstring(data?.boardid) ? data.boardid.trim() : ''
  if (!boardid) {
    return
  }
  const board = memoryreadboardbyaddress(boardid)
  if (!board) {
    return
  }
  const runtime = memoryensureboardruntime(board)
  const action = isstring(data?.action) ? data.action : ''
  const title = isstring(data?.title) ? data.title.trim() : ''
  if (action === 'clear' || !title) {
    delete runtime.mediaqueuenowplayingtitle
  } else {
    runtime.mediaqueuenowplayingtitle = title.slice(0, 120)
  }
  memoryinvalidatedraw(board)
  memoryinvalidategadgetlayerscacheforboard(board.id)
}
