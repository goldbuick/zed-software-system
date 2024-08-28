import * as bin from 'typed-binary'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'

export type WORD = string | number | undefined | WORD[]
export type MAYBE_WORD = MAYBE<WORD>
export type WORD_RESULT = 0 | 1

export const BIN_WORD = bin.keyed('bin-word', (binword) =>
  bin.generic(
    {},
    {
      wordnumber: bin.object({
        value: bin.i32,
      }),
      wordstring: bin.object({
        value: bin.string,
      }),
      wordarray: bin.object({
        value: bin.dynamicArrayOf(binword),
      }),
    },
  ),
)
type BIN_WORD = bin.Parsed<typeof BIN_WORD>

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

export const BIN_WORD_ENTRY = bin.generic(
  {
    name: bin.string,
  },
  {
    wordnumber: bin.object({
      value: bin.i32,
    }),
    wordstring: bin.object({
      value: bin.string,
    }),
    wordarray: bin.object({
      value: bin.dynamicArrayOf(BIN_WORD),
    }),
  },
)
export type BIN_WORD_ENTRY = bin.Parsed<typeof BIN_WORD_ENTRY>

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
