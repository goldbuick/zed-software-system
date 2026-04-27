import type { DEVICELIKE } from 'zss/device/api'
import { createsid } from 'zss/mapping/guid'
import { isarray, isstring } from 'zss/mapping/types'

export type STORAGE_PULL_CHANNEL = 'vm' | 'heavy'

const pending = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
>()

/** Simspace or heavy worker: read one key from main-thread register storage (IndexedDB). */
export function pullstoragevarfrommain(
  device: DEVICELIKE,
  player: string,
  key: string,
  channel: STORAGE_PULL_CHANNEL,
): Promise<unknown> {
  const id = createsid()
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    device.emit(player, 'register:pullvar', [id, key, channel])
  })
}

/** VM or heavy device handler: complete a pending `pullstoragevarfrommain` promise. */
export function resolvestoragepullmessage(data: unknown): void {
  if (!isarray(data) || !isstring(data[0]) || !pending.has(data[0])) {
    return
  }
  const id = data[0]
  const entry = pending.get(id)!
  pending.delete(id)
  if (data.length >= 3 && isstring(data[2])) {
    entry.reject(new Error(data[2]))
  } else {
    entry.resolve(data.length >= 2 ? data[1] : undefined)
  }
}
