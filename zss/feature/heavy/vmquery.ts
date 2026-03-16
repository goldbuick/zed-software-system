/**
 * Request memory data from simspace (vm) via message. Used by the heavy worker
 * only; simspace handles vm:memoryquery and replies with heavy:memoryresult.
 */
import { createsid } from 'zss/mapping/guid'
import { ispresent, isstring } from 'zss/mapping/types'

type emitlike = (player: string, target: string, data?: unknown) => void

const pending = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
>()

export function query(
  device: { emit: emitlike },
  agentid: string,
  payload: { type: string; [k: string]: unknown },
): Promise<unknown> {
  const id = createsid()
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    device.emit(agentid, 'vm:memoryquery', { id, ...payload })
  })
}

export function resolvemessage(message: {
  target?: string
  data?: { id?: string; result?: unknown; error?: string }
}): void {
  if (message.target !== 'memoryresult' || !message.data) {
    return
  }
  const { id, result, error } = message.data
  if (!isstring(id) || !pending.has(id)) {
    return
  }
  const entry = pending.get(id)!
  pending.delete(id)
  if (ispresent(error)) {
    entry.reject(new Error(error))
  } else {
    entry.resolve(result)
  }
}
