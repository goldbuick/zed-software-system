import type { DEVICE } from 'zss/device'
import { apierror, apilog } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { memoryfsapplyops } from 'zss/feature/memoryfs/apply'
import {
  memoryfscheckontick,
  memoryfsprimshadow,
  memoryfsrunexport,
  memoryfssetattached,
  memoryfssetsuppressoutbound,
} from 'zss/feature/memoryfs/sync'
import { isarray, ispresent } from 'zss/mapping/types'

export function handlememoryfsattached(vm: DEVICE, message: MESSAGE): void {
  memoryfssetattached(true)
  memoryfsprimshadow()
  memoryfsrunexport(vm, message.player, true)
  apilog(vm, message.player, 'memoryfs export started')
}

export function handlememoryfsdetached(_vm: DEVICE, message: MESSAGE): void {
  void _vm
  void message
  memoryfssetattached(false)
}

export function handlememoryfsapply(vm: DEVICE, message: MESSAGE): void {
  const data = message.data as
    | {
        writes?: { path: string; bytes: Uint8Array }[]
        deletes?: string[]
      }
    | undefined
  if (!ispresent(data)) {
    return
  }
  const writes = isarray(data.writes) ? data.writes : []
  const deletes = isarray(data.deletes) ? data.deletes : []
  if (writes.length === 0 && deletes.length === 0) {
    return
  }
  memoryfssetsuppressoutbound(true)
  try {
    const result = memoryfsapplyops(writes, deletes)
    memoryfsprimshadow()
    if (result.errors.length > 0) {
      apierror(vm, message.player, 'memoryfs', result.errors[0])
    }
    if (result.ignored > 0) {
      apilog(
        vm,
        message.player,
        `memoryfs ignore read-only player object x${result.ignored}`,
      )
    }
  } finally {
    memoryfssetsuppressoutbound(false)
  }
}

/** Hook from ticktock while memoryfs is attached. */
export function memoryfsvmcheckontick(vm: DEVICE): void {
  memoryfscheckontick(vm)
}
