import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { MAYBE, isarray, isstring } from 'zss/mapping/types'

import { boardrunnerboundarypaint } from '../boardrunnerboundarysync'

export function handleboardrunnerpaint(_vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [doc, boundary] = message.data as [any, MAYBE<string>]
  if (!boundary || !isstring(boundary)) {
    return
  }
  boardrunnerboundarypaint(boundary, doc)
}
