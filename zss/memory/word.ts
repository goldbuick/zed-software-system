import {
  MAYBE,
  NUMBER_OR_STRING,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'

import { FORMAT_ENTRY, FORMAT_TYPE } from './format'
import { WORD } from './types'

// safe to serialize copy of boardelement
export function exportword(word: MAYBE<WORD>): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(word)) {
    return
  }
  if (isnumber(word)) {
    return {
      type: FORMAT_TYPE.FLOAT,
      value: word,
    }
  }
  if (isstring(word)) {
    return {
      type: FORMAT_TYPE.STRING,
      value: word,
    }
  }
  if (isarray(word)) {
    return {
      type: FORMAT_TYPE.LIST,
      value: word.map(exportword).filter(ispresent),
    }
  }
}

// import json into word
export function importword(word: MAYBE<FORMAT_ENTRY>): MAYBE<WORD> {
  if (!ispresent(word)) {
    return
  }
  switch (word.type) {
    case FORMAT_TYPE.FLOAT:
    case FORMAT_TYPE.STRING:
      return word.value
    case FORMAT_TYPE.LIST:
      return word.value.map(importword).filter(ispresent)
  }
}

// safe to serialize copy of boardelement
export function exportwordentry(
  name: NUMBER_OR_STRING,
  word: MAYBE<WORD>,
): MAYBE<FORMAT_ENTRY> {
  if (!ispresent(word)) {
    return
  }
  if (isnumber(name)) {
    if (isnumber(word)) {
      return {
        type: FORMAT_TYPE.ENTRYFLOAT,
        key: name,
        value: word,
      }
    }
    if (isstring(word)) {
      return {
        type: FORMAT_TYPE.ENTRYSTRING,
        key: name,
        value: word,
      }
    }
    if (isarray(word)) {
      return {
        type: FORMAT_TYPE.ENTRYLIST,
        key: name,
        value: word.map(exportword).filter(ispresent),
      }
    }
  }
  if (isstring(name)) {
    if (isnumber(word)) {
      return {
        type: FORMAT_TYPE.USERFLOAT,
        name,
        value: word,
      }
    }
    if (isstring(word)) {
      return {
        type: FORMAT_TYPE.USERSTRING,
        name,
        value: word,
      }
    }
    if (isarray(word)) {
      return {
        type: FORMAT_TYPE.USERLIST,
        name,
        value: word.map(exportword).filter(ispresent),
      }
    }
  }
}

// import json into word
export function importwordentry(
  word: MAYBE<FORMAT_ENTRY>,
): MAYBE<[NUMBER_OR_STRING, WORD]> {
  if (!ispresent(word)) {
    return
  }
  switch (word.type) {
    case FORMAT_TYPE.ENTRYFLOAT:
    case FORMAT_TYPE.ENTRYSTRING:
      return [word.key, word.value]
    case FORMAT_TYPE.ENTRYLIST:
      return [word.key, word.value.map(importword).filter(ispresent)]
    case FORMAT_TYPE.USERFLOAT:
    case FORMAT_TYPE.USERSTRING:
      return [word.name, word.value]
    case FORMAT_TYPE.USERLIST:
      return [word.name, word.value.map(importword).filter(ispresent)]
  }
}

// gather custom values
export function exportwordcustom(
  skip: Record<string, any>,
  obj: any,
): FORMAT_ENTRY[] {
  const entries: FORMAT_ENTRY[] = []

  const keys = Object.keys(obj)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const value = skip[key]
    if (!ispresent(value)) {
      const entry = exportwordentry(key, obj[key])
      if (ispresent(entry)) {
        entries.push(entry)
      }
    }
  }

  return entries
}
