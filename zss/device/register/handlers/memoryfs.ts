import type { DEVICE } from 'zss/device'
import { apierror, apilog } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { MEMORYFS_DEBOUNCE_MS } from 'zss/feature/memoryfs/constants'
import {
  memoryfsfsaattach,
  memoryfsfsaattached,
  memoryfsfsadetach,
  memoryfsfsapolldelta,
  memoryfsfsareadstate,
  memoryfsfsasetpolltimer,
  memoryfsfsawritebatch,
} from 'zss/feature/memoryfs/fsa'
import { isarray, ispresent } from 'zss/mapping/types'

function startpoll(device: DEVICE, player: string) {
  const existing = memoryfsfsareadstate()
  if (!existing || existing.polltimer) {
    return
  }
  const timer = setInterval(() => {
    void (async () => {
      const delta = await memoryfsfsapolldelta()
      if (!delta) {
        return
      }
      device.emit(player, 'vm:memoryfsapply', {
        writes: delta.writes,
        deletes: delta.deletes,
      })
    })()
  }, MEMORYFS_DEBOUNCE_MS)
  memoryfsfsasetpolltimer(timer)
}

export function handlememoryfsattach(device: DEVICE, message: MESSAGE): void {
  const handle = message.data as FileSystemDirectoryHandle | undefined
  if (
    !ispresent(handle) ||
    typeof handle !== 'object' ||
    handle.kind !== 'directory'
  ) {
    apierror(
      device,
      message.player,
      'memoryfs',
      'folder drop requires Chromium File System Access',
    )
    return
  }
  doasync(device, message.player, async () => {
    try {
      if (memoryfsfsaattached()) {
        memoryfsfsadetach()
      }
      const st = await memoryfsfsaattach(handle)
      apilog(
        device,
        message.player,
        `memoryfs attached $26 /${st.dropname}/memoryfs`,
      )
      device.emit(message.player, 'vm:memoryfsattached')
    } catch (err) {
      apierror(
        device,
        message.player,
        'memoryfs',
        err instanceof Error ? err.message : 'attach failed',
      )
    }
  })
}

export function handlememoryfsdetach(device: DEVICE, message: MESSAGE): void {
  memoryfsfsadetach()
  device.emit(message.player, 'vm:memoryfsdetached')
  apilog(device, message.player, 'memoryfs detached')
}

export function handlememoryfswrite(device: DEVICE, message: MESSAGE): void {
  const data = message.data as
    | {
        files?: { path: string; bytes: Uint8Array }[]
        deletes?: string[]
        full?: boolean
      }
    | undefined
  if (!ispresent(data) || !isarray(data.files)) {
    return
  }
  doasync(device, message.player, async () => {
    try {
      await memoryfsfsawritebatch({
        files: data.files ?? [],
        deletes: data.deletes,
        full: data.full,
      })
      startpoll(device, message.player)
    } catch (err) {
      apierror(
        device,
        message.player,
        'memoryfs',
        err instanceof Error ? err.message : 'write failed',
      )
    }
  })
}

export function handlememoryfsstatus(device: DEVICE, message: MESSAGE): void {
  const st = memoryfsfsareadstate()
  if (!st) {
    apilog(device, message.player, 'memoryfs: not attached')
    return
  }
  apilog(
    device,
    message.player,
    `memoryfs: attached $26 /${st.dropname}/memoryfs`,
  )
}
