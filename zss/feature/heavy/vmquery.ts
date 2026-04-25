/**
 * Request memory data from simspace (vm) via message. Used by the heavy worker
 * only; simspace handles vm:query and replies with heavy:queryresult.
 */
import { createsid } from 'zss/mapping/guid'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

type emitlike = (player: string, target: string, data?: unknown) => void

const pending = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
>()

/** Bus `vm:query` data is `[id, type, command?]` (command only for `runcli`). */
export function query(
  device: { emit: emitlike },
  agentid: string,
  payload: { type: string; [k: string]: unknown },
): Promise<unknown> {
  const id = createsid()
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const { type, ...rest } = payload
    const command = rest.command
    if (isstring(command)) {
      device.emit(agentid, 'vm:query', [id, type, command])
    } else {
      device.emit(agentid, 'vm:query', [id, type])
    }
  })
}

/** `heavy:queryresult` data is `[id, result?, error?]` — error in slot 2 rejects. */
export function resolvemessage(message: {
  target?: string
  data?: unknown
}): void {
  if (message.target !== 'queryresult') {
    return
  }
  const d = message.data
  if (!isarray(d) || !isstring(d[0]) || !pending.has(d[0])) {
    return
  }
  const entry = pending.get(d[0])!
  pending.delete(d[0])
  const err = d.length >= 3 ? d[2] : undefined
  if (ispresent(err)) {
    entry.reject(err instanceof Error ? err : new Error(String(err)))
  } else {
    entry.resolve(d[1])
  }
}
