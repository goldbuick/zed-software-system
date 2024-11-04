import { unpack, pack } from 'msgpackr'
import { api_error } from 'zss/device/api'
import { ispresent, MAYBE } from 'zss/mapping/types'

export type FORMAT_OBJECT = [string?, any?, ...FORMAT_OBJECT[]]

export function formatobject(obj: any, keymap: any): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(obj)) {
    return
  }

  const formatted: FORMAT_OBJECT = []

  const keys = Object.keys(obj)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const mkey = keymap[key]
    if (ispresent(mkey)) {
      formatted.push(mkey, obj[key])
    } else {
      formatted.push(key, obj[key])
    }
  }

  return formatted
}

export function unformatobject<T>(
  formatted: MAYBE<FORMAT_OBJECT>,
  keymap: any,
): MAYBE<T> {
  if (!ispresent(formatted)) {
    return
  }

  try {
    const obj: Record<string, any> = {}

    for (let i = 0; i < formatted.length; i += 2) {
      const key = formatted[i]
      const value = formatted[i + 1]
      const mkey = keymap[key]
      if (ispresent(mkey)) {
        obj[mkey] = value
      } else {
        obj[key] = value
      }
    }

    return obj as T
  } catch (err) {
    //
  }
}

// read / write helpers

export function packbinary(entry: FORMAT_OBJECT): MAYBE<Uint8Array> {
  try {
    return pack(entry)
  } catch (err: any) {
    api_error('format', 'binary', err.message)
  }
}

export function unpackbinary(binary: Uint8Array): MAYBE<FORMAT_OBJECT> {
  try {
    return unpack(binary)
  } catch (err: any) {
    api_error('format', 'binary', err.message)
  }
}
