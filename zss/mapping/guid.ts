import humanid from 'human-id'
import { nanoid } from 'nanoid'

export function createguid() {
  return nanoid()
}

export function createname() {
  return humanid({
    capitalize: false,
    adjectiveCount: 1,
  })
}
