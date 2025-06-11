import { T9Search } from 't9-plus'
import { register_t9words } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'

import words from './t9words.json'

const t9 = new T9Search()
const wordmap = new Map<string, string>()
for (let i = 0; i < words.length; ++i) {
  wordmap.set(words[i].word, words[i].freq)
}
t9.setDictWithWeight(wordmap)

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
    case '++':
      return '-'
    case '**':
      return '%'
    case '((':
      return '<'
    case '))':
      return '>'
    case '11':
      return '='
    case '??':
      return '/'
    case '!!':
      return ';'
    case '::':
      return `'`
    case '$$':
      return '"'
    case '##':
      return '@'
    case ',,':
      return '^'
    case '..':
      return '&'
    case '[[':
      return '{'
    case ']]':
      return '}'
    case '||':
      return '\\'
    case '==':
      return '~'
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
