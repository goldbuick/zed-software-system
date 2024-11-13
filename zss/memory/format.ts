import { compress, decompress, trimUndefinedRecursively } from 'compress-json'
import { unpack, pack } from 'msgpackr'
import { api_error } from 'zss/device/api'
import { deepcopy, ispresent, MAYBE } from 'zss/mapping/types'

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

    const mkey = keymap[key]
    if (ispresent(mkey)) {
      key = mkey
    }

    const formatter = formatmap[key]
    if (ispresent(formatter)) {
      value = formatter(value)
    }

    if (value !== null) {
      formatted.push(mkey, value)
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

      const mkey = keymap[key]
      if (ispresent(mkey)) {
        key = mkey
      }

      const formatter = formatmap[key]
      if (ispresent(formatter)) {
        value = formatter(value)
      }

      obj[key] = value
    }

    return obj as T
  } catch (err) {
    //
  }
}

// read / write helpers

export function packbinary(entry: FORMAT_OBJECT): MAYBE<Uint8Array> {
  try {
    // TODO: rework compress to binary
    const data = deepcopy(entry)
    trimUndefinedRecursively(data)
    return pack(compress(data))
  } catch (err: any) {
    api_error('format', 'binary', err.message)
  }
}

export function unpackbinary(binary: Uint8Array): MAYBE<FORMAT_OBJECT> {
  try {
    const maybedata = unpack(binary)
    try {
      return decompress(maybedata)
    } catch (err: any) {
      return maybedata
    }
  } catch (err: any) {
    api_error('format', 'binary', err.message)
  }
}
