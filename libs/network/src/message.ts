import mitt from 'mitt'
import { MESSAGE } from './types'

const emitter = mitt<MESSAGE>()

export type MessageCallback<Key extends keyof MESSAGE> = (
  data: MESSAGE[Key],
) => void

export function sendMessage<Key extends keyof MESSAGE>(
  message: Key,
  data: MESSAGE[Key],
) {
  emitter.emit(message, data)
}

export function onMessage<Key extends keyof MESSAGE>(
  message: Key,
  callback: MessageCallback<Key>,
) {
  emitter.on(message, callback)
  return callback
}

export function offMessage<Key extends keyof MESSAGE>(
  message: Key,
  callback: MessageCallback<Key>,
) {
  emitter.off(message, callback)
}
