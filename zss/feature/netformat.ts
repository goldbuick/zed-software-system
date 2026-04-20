import { CborDecoder } from '@jsonjoy.com/json-pack/lib/cbor/CborDecoder'
import { CborEncoder } from '@jsonjoy.com/json-pack/lib/cbor/CborEncoder'
import { type MESSAGE, ismessage } from 'zss/device/api'

const cborwriter = new CborEncoder()
const cboreader = new CborDecoder()

/** Convert only Set & Map so PeerJS binary pack / CBOR do not choke on non-JSON types. */
export function netserializable<T>(value: T): T {
  if (value instanceof Set) {
    return [...value] as T
  }
  if (value instanceof Map) {
    return Object.fromEntries(value) as T
  }
  if (Array.isArray(value)) {
    return value.map(netserializable) as T
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    (value as object).constructor === Object
  ) {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as object)) {
      out[k] = netserializable((value as Record<string, unknown>)[k])
    }
    return out as T
  }
  return value
}

export function netformatencode(message: MESSAGE): Uint8Array {
  return cborwriter.encode(netserializable(message) as unknown)
}

export function netformatdecode(frame: Uint8Array | ArrayBuffer): MESSAGE {
  const bytes = frame instanceof ArrayBuffer ? new Uint8Array(frame) : frame
  const decoded = cboreader.decode(bytes)
  if (!ismessage(decoded)) {
    throw new Error('netformatdecode: payload is not a valid MESSAGE')
  }
  return decoded
}
