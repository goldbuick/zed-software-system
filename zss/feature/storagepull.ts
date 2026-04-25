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
  if (!data || typeof data !== 'object') {
    return
  }
  if (isarray(data)) {
    return
  }
  const o = data as { id?: string; value?: unknown; error?: string }
  if (!isstring(o.id) || !pending.has(o.id)) {
    return
  }
  const entry = pending.get(o.id)!
  pending.delete(o.id)
  if (isstring(o.error)) {
    entry.reject(new Error(o.error))
  } else {
    entry.resolve(o.value)
  }
}
