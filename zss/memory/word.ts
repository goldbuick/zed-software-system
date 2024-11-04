import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'

import {
  FORMAT_ENTRY,
  FORMAT_KEY,
  FORMAT_TYPE,
  formatlist,
  formatnumber,
  formatstring,
} from './format'
import { WORD } from './types'

// safe to serialize copy of boardelement
export function exportword(
  word: MAYBE<WORD>,
  key?: FORMAT_KEY,
): MAYBE<FORMAT_ENTRY> {
  if (isnumber(word)) {
    return formatnumber(word, key)
  }
  if (isstring(word)) {
    return formatstring(word, key)
  }
  if (isarray(word)) {
    return formatlist(word.map(exportword), key)
  }
}

// import json into word
export function importword(word: MAYBE<FORMAT_ENTRY>): MAYBE<WORD> {
  if (!ispresent(word)) {
    return
  }
  switch (word.type) {
    case FORMAT_TYPE.NUMBER:
    case FORMAT_TYPE.STRING:
      return word.value
    case FORMAT_TYPE.LIST:
      return word.value.map(importword).filter(ispresent)
  }
}

// gather custom values
export function exportwordcustom(
  obj: any,
  skip: Record<string, any>,
): FORMAT_ENTRY[] {
  const entries: FORMAT_ENTRY[] = []

  const keys = Object.keys(obj)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const value = skip[key]
    if (!ispresent(value)) {
      const entry = exportword(obj[key], key)
      if (ispresent(entry)) {
        entries.push(entry)
      }
    }
  }

  return entries
}

export function importwordcustom(obj: any, skip: Record<string, any>) {
  const keys = Object.keys(obj)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const value = skip[key]
    if (!ispresent(value)) {
      obj[key] = importword(obj[key])
    }
  }
}
