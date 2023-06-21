import { onMessage, offMessage, MessageCallback } from '@zss/network/message'
import { MESSAGE } from '@zss/network/types'
import { useRef, useEffect } from 'react'

export function useMessage<Key extends keyof MESSAGE>(
  message: Key,
  callback: MessageCallback<Key>,
) {
  const ref = useRef(callback)

  useEffect(() => {
    ref.current = callback
  }, [callback])

  useEffect(() => {
    function handler(data: MESSAGE[Key]) {
      ref.current?.call(null, data)
    }

    if (message) {
      onMessage(message, handler)
    }

    return () => {
      if (message) {
        offMessage(message, handler)
      }
    }
  }, [message])
}
