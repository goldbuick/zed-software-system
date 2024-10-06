import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'

import { BIN_WORD, BIN_WORD_ENTRY } from './binary'

export type WORD = string | number | undefined | WORD[]
export type MAYBE_WORD = MAYBE<WORD>
export type WORD_RESULT = 0 | 1

// safe to serialize copy of boardelement
export function exportword(word: MAYBE_WORD): MAYBE<BIN_WORD> {
  if (!ispresent(word)) {
    return
  }
  if (isnumber(word)) {
    return {
      type: 'wordnumber',
      value: word,
    }
  }
  if (isstring(word)) {
    return {
      type: 'wordstring',
      value: word,
    }
  }
  if (isarray(word)) {
    return {
      type: 'wordarray',
      value: word.map(exportword).filter(ispresent),
    }
  }
}

// import json into word
export function importword(word: MAYBE<BIN_WORD>): MAYBE_WORD {
  if (!ispresent(word)) {
    return
  }
  switch (word.type) {
    case 'wordnumber':
    case 'wordstring':
      return word.value
    case 'wordarray':
      return word.value.map(importword).filter(ispresent)
  }
}

// safe to serialize copy of boardelement
export function exportwordentry(
  name: string,
  word: MAYBE_WORD,
): MAYBE<BIN_WORD_ENTRY> {
  if (!ispresent(word)) {
    return
  }
  if (isarray(word)) {
    return {
      name,
      type: 'wordarray',
      value: word.map(exportword).filter(ispresent),
    }
  }
  if (isstring(word)) {
    return {
      name,
      type: 'wordstring',
      value: word,
    }
  }
  if (isnumber(word)) {
    return {
      name,
      type: 'wordnumber',
      value: word,
    }
  }
}

// import json into word
export function importwordentry(
  word: MAYBE<BIN_WORD_ENTRY>,
): MAYBE<[string, WORD]> {
  if (!ispresent(word)) {
    return
  }
  switch (word.type) {
    case 'wordnumber':
    case 'wordstring':
      return [word.name, word.value]
    case 'wordarray':
      return [word.name, word.value.map(importword).filter(ispresent)]
  }
}
