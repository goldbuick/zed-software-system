import words from '@nkzw/safe-word-list'
import { T9Search } from 't9-plus'

const t9 = new T9Search()
t9.setDict(words)

export function predict(input: string) {
  return t9.predict(input)
}
