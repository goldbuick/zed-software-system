/** Control-plane messages on the media-queue DataConnection (not video). */

export const MEDIAQUEUE_PROTOCOL = 'mediaqueue/v1'

export type MEDIAQUEUE_HELLO = {
  type: 'mediaqueue:hello'
  protocol: typeof MEDIAQUEUE_PROTOCOL
  role: 'cafe' | 'helper'
  peerid: string
}

export type MEDIAQUEUE_QUEUE = {
  type: 'mediaqueue:queue'
  urls: string[]
  index: number
}

export type MEDIAQUEUE_GOTO = {
  type: 'mediaqueue:goto'
  index: number
  url: string
}

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
    type === 'mediaqueue:status' ||
    type === 'mediaqueue:requestcall'
  )
}
