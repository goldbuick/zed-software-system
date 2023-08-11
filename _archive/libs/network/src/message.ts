import mitt from 'mitt'

import { MESSAGE } from './types'

const emitter = mitt<MESSAGE>()

export type MessageCallback<Key extends keyof MESSAGE> = (
  messageData: MESSAGE[Key],
) => void

export function sendMessage<Key extends keyof MESSAGE>(
  message: Key,
  messageData: MESSAGE[Key],
) {
  console.log('sendMessage', message, messageData)
  emitter.emit(message, messageData)
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
