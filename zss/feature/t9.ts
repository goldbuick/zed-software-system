import { T9Search } from 't9-plus'

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

export function checkforword(input: string, index: number): string | string[] {
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
  }

  let start = index - 1
  while (start >= 0) {
    if (/[^\d]/.test(input[start])) {
      break
    }
    --start
  }

  let end = index
  while (end < input.length) {
    if (/[^\d]/.test(input[end])) {
      break
    } else {
      end++
    }
  }

  const word = input.substring(start, end)
  return predict(word)
}
