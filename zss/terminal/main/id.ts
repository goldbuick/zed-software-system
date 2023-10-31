import { customAlphabet } from 'nanoid'
import { nolookalikes } from 'nanoid-dictionary'

export const createPlayerId = customAlphabet(nolookalikes, 16)

let readId = localStorage.getItem('zid')
if (readId === null) {
  readId = `zid-${createPlayerId()}`
  localStorage.setItem('zid', readId)
}

export const systemId = readId
