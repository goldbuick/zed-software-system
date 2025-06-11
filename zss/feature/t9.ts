import { T9Search } from 't9-plus'
import { register_t9words } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'

import words from './t9words.json'

const t9 = new T9Search()
const DYNAMIC_RANK = '23135852999'

export function setup(dynamicwords: string[]) {
  const withlist = words as { word: string; freq: string }[]
  const wordmap = new Map<string, string>()
  for (let i = 0; i < withlist.length; ++i) {
    wordmap.set(withlist[i].word, withlist[i].freq)
  }
  for (let i = 0; i < dynamicwords.length; ++i) {
    wordmap.set(dynamicwords[i], DYNAMIC_RANK)
  }
  t9.setDictWithWeight(wordmap)
}

export function predict(input: string) {
  return t9.predict(input)
}

export function checkforword(
  input: string,
  index: number,
  player: string,
): string {
  const lasttwo = input.substring(index - 2, index)
  switch (lasttwo) {
    // main
    case '++':
      return '-'
    case '**':
      return '%'
    case '((':
      return '<'
    case '))':
      return '>'
    case '??':
      return '/'
    case '!!':
      return ';'
    case `''`:
      return ':'
    case '$$':
      return '"'
    case '##':
      return '@'
    // alt
    case ',,':
      return '^'
    case '..':
      return '&'
    case '[[':
      return '{'
    case ']]':
      return '}'
    case '>>':
      return '<'
    case '||':
      return '\\'
    case '==':
      return '_'
    case 'xx':
      return '#'
  }

  const lastone = input[index - 1]
  if (/\d/.test(lastone) === false) {
    return ''
  }

  let i = index - 1
  // walk back until we find a non-digit
  for (; i >= 0; --i) {
    if (/\d/.test(input[i]) === false) {
      i++
      break
    }
  }

  const checknumbers = input.substring(i, index)
  const results = predict(checknumbers).slice(0, 32)
  register_t9words(SOFTWARE, player, checknumbers, results)

  return ''
}
