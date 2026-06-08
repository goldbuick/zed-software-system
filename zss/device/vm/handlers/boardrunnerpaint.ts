import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerboundarypaint } from 'zss/device/vm/boardrunnerboundarysync'
import { gadgetsynctick } from 'zss/device/vm/gadgetsynctick'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  ishostmemorytraceenabled,
  tracehostmemory,
} from 'zss/testsupport/hostmemorytrace'

export function handleboardrunnerpaint(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [doc, boundary] = message.data as [any, MAYBE<string>]
  if (!boundary || !isstring(boundary)) {
    return
  }
  boardrunnerboundarypaint(boundary, doc)
  if (ispresent(doc?.board)) {
    // #region agent log
    if (ishostmemorytraceenabled()) {
      tracehostmemory('host:gadget:resync', 'H17', '', undefined, {
        source: 'boardrunnerpaint',
        boundary,
      })
    }
    // #endregion
    gadgetsynctick(vm)
  }
}
