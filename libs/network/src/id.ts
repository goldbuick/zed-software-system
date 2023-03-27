import { nanoid } from 'nanoid'

export function createId() {
  const text = new TextEncoder()
  return text.encode(nanoid())
}
