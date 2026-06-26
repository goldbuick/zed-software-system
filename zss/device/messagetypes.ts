import { isstring } from 'zss/mapping/types'

export type DEVICELIKE = {
  emit: (player: string, target: string, data?: any) => void
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

/** Terminal error line via device emit — worker-safe (no device/api import). */
export function workerlogerror(
  device: DEVICELIKE,
  player: string,
  kind: string,
  ...message: any[]
) {
  device.emit(player, 'log', [`$red${kind}$blue>>`, ...message])
  return false
}

export type TTS_VALIDATE_REPLY =
  | { ok: true; model: string }
  | { ok: false; errormsg: string }

export function isttsvalidatereply(
  value: unknown,
): value is TTS_VALIDATE_REPLY {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof (value as TTS_VALIDATE_REPLY).ok === 'boolean'
  )
}
