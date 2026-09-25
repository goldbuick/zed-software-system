/** Cafe <-> media-stream companion control protocol. */

export const MEDIASTREAM_PROTOCOL = 'mediastream/v1'

export const MEDIASTREAM_PEER_PREFIX = 'ms_'

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
}

export type MEDIASTREAM_MESSAGE =
  | MEDIASTREAM_HELLO
  | MEDIASTREAM_BIND_ACK
  | MEDIASTREAM_GO_LIVE
  | MEDIASTREAM_STOP
  | MEDIASTREAM_STATUS

export function ismediastreammessage(
  value: unknown,
): value is MEDIASTREAM_MESSAGE {
  if (!value || typeof value !== 'object') {
    return false
  }
  const type = (value as { type?: unknown }).type
  return typeof type === 'string' && type.startsWith('mediastream:')
}

export function ismediastreampeerid(value: string): boolean {
  return String(value || '')
    .trim()
    .toLowerCase()
    .startsWith(MEDIASTREAM_PEER_PREFIX)
}

export function withmsprefix(peerid: string): string {
  const trimmed = String(peerid || '').trim()
  if (!trimmed) {
    return trimmed
  }
  if (trimmed.toLowerCase().startsWith(MEDIASTREAM_PEER_PREFIX)) {
    return trimmed
  }
  return MEDIASTREAM_PEER_PREFIX + trimmed
}
