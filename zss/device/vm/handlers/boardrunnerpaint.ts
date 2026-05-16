import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerboundarypipeforget } from 'zss/device/vm/boardrunnerboundarysync'
import { isarray, isstring } from 'zss/mapping/types'
import { memoryboundaryset } from 'zss/memory/boundaries'

export function handleboardrunnerpaint(_vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [doc, boundary] = message.data as [unknown, unknown]
  if (!isstring(boundary) || boundary.length === 0) {
    return
  }
  memoryboundaryset(boundary, doc)
  boardrunnerboundarypipeforget(boundary)
}
