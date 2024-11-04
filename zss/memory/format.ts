import { unpack, pack } from 'msgpackr'
import { api_error } from 'zss/device/api'
import {
  isnumber,
  ispresent,
  isstring,
  MAYBE,
  MAYBE_NUMBER,
  MAYBE_STRING,
} from 'zss/mapping/types'

export enum FORMAT_TYPE {
  // values
  NUMBER,
  STRING,
  // lists
  LIST,
  BYTELIST,
  NUMBERLIST,
  STRINGLIST,
}

export type FORMAT_KEY = number | string

export type FORMAT_ENTRY =
  | {
      type: FORMAT_TYPE.NUMBER
      key?: FORMAT_KEY
      value: number
    }
  | {
      type: FORMAT_TYPE.STRING
      key?: FORMAT_KEY
      value: string
    }
  | {
      type: FORMAT_TYPE.LIST
      key?: FORMAT_KEY
      value: FORMAT_ENTRY[]
    }
  | {
      type: FORMAT_TYPE.BYTELIST
      key?: FORMAT_KEY
      value: Uint8Array
    }
  | {
      type: FORMAT_TYPE.NUMBERLIST
      key?: FORMAT_KEY
      value: number[]
    }
  | {
      type: FORMAT_TYPE.STRINGLIST
      key?: FORMAT_KEY
      value: string[]
    }

export function formatnumber(
  value: MAYBE_NUMBER,
  key?: FORMAT_KEY,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.NUMBER,
    key,
    value,
  }
}

export function formatstring(
  value: MAYBE_STRING,
  key?: FORMAT_KEY,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.STRING,
    key,
    value,
  }
}

export function formatlist(
  value: MAYBE<MAYBE<FORMAT_ENTRY>[]>,
  key?: FORMAT_KEY,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.LIST,
    key,
    value: value.filter(ispresent),
  }
}

export function formatbytelist(
  value: MAYBE<Uint8Array>,
  key?: FORMAT_KEY,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.BYTELIST,
    key,
    value,
  }
}

export function formatnumberlist(
  value: MAYBE<MAYBE<number>[]>,
  key?: FORMAT_KEY,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.NUMBERLIST,
    key,
    value: value.filter(ispresent),
  }
}

export function formatstringlist(
  value: MAYBE<MAYBE<string>[]>,
  key?: FORMAT_KEY,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(value)) {
    return
  }
  return {
    type: FORMAT_TYPE.STRINGLIST,
    key,
    value: value.filter(ispresent),
  }
}

// read / write helpers

export function packbinary(entry: FORMAT_ENTRY): MAYBE<Uint8Array> {
  try {
    return pack(entry)
  } catch (err: any) {
    api_error('format', 'binary', err.message)
  }
}

export function unpackbinary(binary: Uint8Array): MAYBE<FORMAT_ENTRY> {
  try {
    return unpack(binary)
  } catch (err: any) {
    api_error('format', 'binary', err.message)
  }
}

export function unpackformatlist<T>(
  entrylist: MAYBE<FORMAT_ENTRY>,
  keymap: Record<number, string>,
): MAYBE<T> {
  if (entrylist?.type !== FORMAT_TYPE.LIST) {
    return
  }

  const obj: Record<string, any> = {}
  for (let i = 0; i < entrylist.value.length; ++i) {
    const entry = entrylist.value[i]

    let key = ''
    if (isnumber(entry.key)) {
      key = keymap[entry.key]
    } else if (isstring(entry.key)) {
      key = entry.key
    } else {
      // skip
    }

    switch (entry.type) {
      default:
        obj[key] = entry
        break
      case FORMAT_TYPE.NUMBER:
      case FORMAT_TYPE.STRING:
        obj[key] = entry.value
        break
    }
  }

  return obj as MAYBE<T>
}
