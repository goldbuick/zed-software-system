import { pack, unpack } from 'msgpackr'
import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'

export type FORMAT_OBJECT = [string?, any?, ...FORMAT_OBJECT[]]

export type FORMAT_METHOD = (value: any) => any

export function FORMAT_SKIP() {
  return null
}

export function formatobject(
  obj: any,
  keymap: any,
  formatmap: Record<string, FORMAT_METHOD> = {},
): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(obj)) {
    return
  }

  const formatted: FORMAT_OBJECT = []

  const keys = Object.keys(obj)
  for (let i = 0; i < keys.length; ++i) {
    let key = keys[i]
    let value = obj[key]

    const formatter = formatmap[key]
    if (ispresent(formatter)) {
      value = formatter(value)
    }

    // map to enum key
    const mkey = keymap[key]
    if (ispresent(mkey)) {
      key = mkey
    }

    if (value !== null) {
      formatted.push(key, value)
    }
  }

  return formatted
}

export function unformatobject<T>(
  formatted: MAYBE<FORMAT_OBJECT>,
  keymap: any,
  formatmap: Record<string, FORMAT_METHOD> = {},
): MAYBE<T> {
  if (!ispresent(formatted)) {
    return
  }

  try {
    const obj: Record<string, any> = {}

    for (let i = 0; i < formatted.length; i += 2) {
      let key = formatted[i]
      let value = formatted[i + 1]

      // convert from enum key
      const mkey = keymap[key]
      if (ispresent(mkey)) {
        key = mkey
      }

      // handle imports
      const formatter = formatmap[key]
      if (ispresent(formatter)) {
        value = formatter(value)
      }

      // set value
      obj[key] = value
    }

    return obj as T
  } catch (err: any) {
    apierror(SOFTWARE, '', 'format', err.message)
  }
}

// msgpackr/json-pack do not support Set/Map/functions; sanitize to plain JSON-serializable structures
export function sanitizeForPack(value: unknown): unknown {
  if (typeof value === 'function') {
    return null
  }
  if (value instanceof Set) {
    return [...value].map(sanitizeForPack)
  }
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value.entries()].map(([k, v]) => [sanitizeForPack(k), sanitizeForPack(v)]),
    )
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeForPack)
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value)) {
      const sanitized = sanitizeForPack((value as Record<string, unknown>)[k])
      if (sanitized !== undefined) {
        out[k] = sanitized
      }
    }
    return out
  }
  return value
}

// read / write helpers

export function packformat(entry: FORMAT_OBJECT): MAYBE<Uint8Array> {
  try {
    const sanitized = sanitizeForPack(entry) as FORMAT_OBJECT
    const data = pack(sanitized)
    // console.info('write', data)
    return data
  } catch (err: any) {
    apierror(SOFTWARE, '', 'format', err.message)
  }
}

export function unpackformat(
  content: string | Uint8Array,
): MAYBE<FORMAT_OBJECT> {
  if (isstring(content)) {
    try {
      const data = JSON.parse(content)
      // console.info('read', deepcopy(unpacked))
      return data
    } catch (err: any) {
      apierror(SOFTWARE, '', 'format', err.message)
    }
    return undefined
  }
  try {
    const data = unpack(content)
    return data
  } catch (err: any) {
    apierror(SOFTWARE, '', 'format', err.message)
  }
  return undefined
}
