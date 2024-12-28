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
    api_error('format', 'binary', err.message)
  }
}

// read / write helpers

/*

compression thoughts idea:
we have string lookup table for __all__ strings

keys are base64 encoded index starting at 0,1,2, etc.. to create 
the smallest keysize possible with a string ?

so part of the pack process is de-duping strings

*/

export function packbinary(entry: FORMAT_OBJECT): MAYBE<Uint8Array> {
  try {
    const data = deepcopy(entry)
    trimUndefinedRecursively(data)
    // console.info('wrote', deepcopy(data))
    return pack(data)
  } catch (err: any) {
    api_error('format', 'binary', err.message)
  }
}

export function unpackbinary(binary: Uint8Array): MAYBE<FORMAT_OBJECT> {
  try {
    const data = unpack(binary)
    // console.info('read', deepcopy(data))
    return data
  } catch (err: any) {
    api_error('format', 'binary', err.message)
  }
}
