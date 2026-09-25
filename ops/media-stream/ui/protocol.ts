/** Control-plane messages on the media-stream DataConnection. */

export const MEDIASTREAM_PROTOCOL = 'mediastream/v1'

export type MEDIASTREAM_HELLO = {
  type: 'mediastream:hello'
  protocol: typeof MEDIASTREAM_PROTOCOL
  role: 'cafe' | 'companion'
  peerid: string
}

export type MEDIASTREAM_BIND_ACK = {
  type: 'mediastream:bindack'
  ok: boolean
  peerid: string
}

export type MEDIASTREAM_GO_LIVE = {
  type: 'mediastream:golive'
}

export type MEDIASTREAM_STOP = {
  type: 'mediastream:stop'
}

export type MEDIASTREAM_STATUS = {
  type: 'mediastream:status'
  status: string
  streaming: boolean
  destinations?: {
    id: string
    label: string
    enabled: boolean
    live: boolean
  }[]
}

export type MEDIASTREAM_WHIP_BLOCKED = {
  type: 'mediastream:whipblocked'
  reason: string
}

export type MEDIASTREAM_MESSAGE =
  | MEDIASTREAM_HELLO
  | MEDIASTREAM_BIND_ACK
  | MEDIASTREAM_GO_LIVE
  | MEDIASTREAM_STOP
  | MEDIASTREAM_STATUS
  | MEDIASTREAM_WHIP_BLOCKED

export function ismediastreammessage(
  value: unknown,
): value is MEDIASTREAM_MESSAGE {
  if (!value || typeof value !== 'object') {
    return false
  }
  const type = (value as { type?: unknown }).type
  return typeof type === 'string' && type.startsWith('mediastream:')
}
