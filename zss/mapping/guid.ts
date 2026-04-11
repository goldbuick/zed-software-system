import Alea from 'alea'
import humanid from 'human-id'
import { customAlphabet, nanoid } from 'nanoid'
import { lowercase, numbers } from 'nanoid-dictionary'

import { MAYBE } from './types'

export function createsid() {
  return `sid_${nanoid(12).replaceAll('-', '.')}`
}

export function issid(id: MAYBE<string>): id is string {
  return typeof id === 'string' && id.startsWith('sid_')
}

const JUST_NUMBER_CHARS = customAlphabet(numbers, 4)
const MIXED_CHARS = customAlphabet(`${numbers}${lowercase}`, 16)

export function createpid() {
  return `pid_${JUST_NUMBER_CHARS()}_${MIXED_CHARS()}`
}

export function createtopic() {
  return nanoid()
}

export function ispid(id: MAYBE<string>): id is string {
  return typeof id === 'string' && id.startsWith('pid_')
}

export function createnameid() {
  return humanid({
    capitalize: false,
    adjectiveCount: 1,
  })
}

export function createshortnameid() {
  return humanid({
    addAdverb: false,
    capitalize: false,
    adjectiveCount: 0,
  })
}

const PEER_ID_LENGTH = 20
const HEX_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function createinfohash(source: string): string {
  const rng = Alea(source)
  const chars: string[] = []
  for (let i = 0; i < PEER_ID_LENGTH; ++i) {
    chars.push(HEX_CHARS[Math.floor(rng() * HEX_CHARS.length)])
  }
  return chars.join('')
}
