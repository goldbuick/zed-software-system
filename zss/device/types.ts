import { isstring } from 'zss/mapping/types'

export type DEVICELIKE = {
  emit: (player: string, target: string, data?: any) => void
  /** Same-realm only; skips BroadcastChannel. For non-cloneable handles only (e.g. FileSystemDirectoryHandle). */
  emitlocal: (player: string, target: string, data?: any) => void
}

export type MESSAGE = {
  session: string
  player: string
  id: string
  sender: string
  target: string
  data?: any
}

export function ismessage(value: any): value is MESSAGE {
  return (
    typeof value === 'object' &&
    isstring(value.session) &&
    isstring(value.player) &&
    isstring(value.id) &&
    isstring(value.sender) &&
    isstring(value.target)
  )
}
