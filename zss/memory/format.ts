import stringify from 'json-stable-stringify'
import { unpack } from 'msgpackr'
import { objectKeys } from 'ts-extras'
import { api_error } from 'zss/device/api'
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
    api_error(SOFTWARE, '', 'format', err.message)
  }
}

// read / write helpers

function addstringlookup(lookup: Map<string, number>, content: string) {
  const current = lookup.get(content) ?? 0
  lookup.set(content, current + 1)
}

function createstringlookup(lookup: Map<string, number>, content: any) {
  if (Array.isArray(content)) {
    content.map((item) => createstringlookup(lookup, item))
  } else if (typeof content === 'object') {
    const keys = objectKeys(content)
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i]
      addstringlookup(lookup, key)
      createstringlookup(lookup, content[key])
    }
  } else if (isstring(content)) {
    addstringlookup(lookup, content)
  } else {
    // skip
  }
}

function createstringdictionary(
  lookup: Map<string, number>,
  dictionary: Map<string, string>,
) {
  let id = 0
  const strings = [...lookup.keys()]
  for (let i = 0; i < strings.length; ++i) {
    const content = strings[i]

    const count = lookup.get(content) ?? 0
    const currenttotal = content.length * count

    const truncated = id.toString(16)
    const truncatedtotal = content.length + truncated.length * count

    if (truncatedtotal < currenttotal) {
      dictionary.set(content, truncated)
      ++id
    }
  }
}

function applystringdictionary(
  dictionary: Map<string, string>,
  content: any,
): any {
  if (Array.isArray(content)) {
    return content.map((item) => applystringdictionary(dictionary, item))
  }
  if (typeof content === 'object') {
    const copy: any = {}
    const keys = objectKeys(content)
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i]
      const packedkey = dictionary.get(key) ?? key
      copy[packedkey] = applystringdictionary(dictionary, content[key])
    }
    return copy
  }
  if (isstring(content)) {
    return dictionary.get(content) ?? content
  }
  return content
}

function unpackwithdictionary(dictionary: any, content: any): any {
  // invert dictionary and re-run apply
  const inverted = new Map<string, string>()
  const keys = objectKeys(dictionary)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const value = dictionary[key] ?? ''
    inverted.set(value, key)
  }
  return applystringdictionary(inverted, content)
}

export function packformat(entry: FORMAT_OBJECT): MAYBE<string> {
  try {
    // const lookup = new Map<string, number>()
    // const dictionary = new Map<string, string>()
    // createstringlookup(lookup, entry)
    // createstringdictionary(lookup, dictionary)
    // const data = stringify({
    //   pp: Object.fromEntries(dictionary),
    //   dd: applystringdictionary(dictionary, entry),
    // })
    const data = stringify(entry)
    console.info('write', data)
    return data
  } catch (err: any) {
    api_error(SOFTWARE, '', 'format', err.message)
  }
}

export function unpackformat(
  content: string | Uint8Array,
): MAYBE<FORMAT_OBJECT> {
  if (isstring(content)) {
    try {
      const data = JSON.parse(content)
      // detect lookup format
      const unpacked =
        ispresent(data.pp) && ispresent(data.dd)
          ? unpackwithdictionary(data.pp, data.dd)
          : data
      // console.info('read', deepcopy(unpacked))
      return unpacked
    } catch (err: any) {
      api_error(SOFTWARE, '', 'format', err.message)
    }
    return undefined
  }
  try {
    const data = unpack(content)
    return data
  } catch (err: any) {
    api_error(SOFTWARE, '', 'format', err.message)
  }
  return undefined
}
