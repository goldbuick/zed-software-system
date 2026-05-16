import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerboundarypipeforget } from 'zss/device/vm/boardrunnerboundarysync'
import { MAYBE, deepcopy, isarray, isstring } from 'zss/mapping/types'
import { memoryboundaryset } from 'zss/memory/boundaries'

export function handleboardrunnerpaint(_vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [doc, boundary] = message.data as [any, MAYBE<string>]
  if (!boundary || !isstring(boundary)) {
    return
  }
  console.info(
    `${self.name} $$$ vm:boardrunnerpaint ${boundary}`,
    deepcopy(doc),
  )
  memoryboundaryset(boundary, doc)
  boardrunnerboundarypipeforget(boundary)
}
