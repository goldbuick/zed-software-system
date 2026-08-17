/** Control-plane messages on the media-queue DataConnection (not video). */

export const MEDIAQUEUE_PROTOCOL = 'mediaqueue/v1'

export type MEDIAQUEUE_HELLO = {
  type: 'mediaqueue:hello'
  protocol: typeof MEDIAQUEUE_PROTOCOL
  role: 'cafe' | 'helper'
  peerid: string
}

/** @deprecated Helper owns the FIFO. Cafe must not send this as a write. */
export type MEDIAQUEUE_QUEUE = {
  type: 'mediaqueue:queue'
  urls: string[]
  index: number
}

/** @deprecated Helper owns playback advance. Cafe must not send this as a write. */
export type MEDIAQUEUE_GOTO = {
  type: 'mediaqueue:goto'
  index: number
  url: string
}

export type MEDIAQUEUE_ADD = {
  type: 'mediaqueue:add'
  url: string
  player: string
  name: string
}

export type MEDIAQUEUE_SKIP = {
  type: 'mediaqueue:skip'
}

export type MEDIAQUEUE_CLEAR = {
  type: 'mediaqueue:clear'
}

export type MEDIAQUEUE_SET_LIMIT = {
  type: 'mediaqueue:setlimit'
  limit: number
}

export type MEDIAQUEUE_QUEUE_SNAPSHOT = {
  type: 'mediaqueue:queuesnapshot'
  urls: string[]
  names: string[]
  index: number
  limit: number
}

/** Helper -> cafe status strings (mediaqueue:status). Includes playback-ended. */
export type MEDIAQUEUE_STATUS = {
  type: 'mediaqueue:status'
  status: string
  detail?: string
}

export type MEDIAQUEUE_REQUEST_CALL = {
  type: 'mediaqueue:requestcall'
}

export type MEDIAQUEUE_MESSAGE =
  | MEDIAQUEUE_HELLO
  | MEDIAQUEUE_QUEUE
  | MEDIAQUEUE_GOTO
  | MEDIAQUEUE_ADD
  | MEDIAQUEUE_SKIP
  | MEDIAQUEUE_CLEAR
  | MEDIAQUEUE_SET_LIMIT
  | MEDIAQUEUE_QUEUE_SNAPSHOT
  | MEDIAQUEUE_STATUS
  | MEDIAQUEUE_REQUEST_CALL

export function ismediaqueuemessage(data: unknown): data is MEDIAQUEUE_MESSAGE {
  if (!data || typeof data !== 'object') {
    return false
  }
  const type = (data as { type?: unknown }).type
  return (
    type === 'mediaqueue:hello' ||
    type === 'mediaqueue:queue' ||
    type === 'mediaqueue:goto' ||
    type === 'mediaqueue:add' ||
    type === 'mediaqueue:skip' ||
    type === 'mediaqueue:clear' ||
    type === 'mediaqueue:setlimit' ||
    type === 'mediaqueue:queuesnapshot' ||
    type === 'mediaqueue:status' ||
    type === 'mediaqueue:requestcall'
  )
}
