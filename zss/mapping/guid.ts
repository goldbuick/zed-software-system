import humanid from 'human-id'
import { customAlphabet, nanoid } from 'nanoid'
import { lowercase, numbers } from 'nanoid-dictionary'

import { MAYBE } from './types'

export function createsid() {
  return `sid_${nanoid(12).replaceAll('-', '.')}`
}

export function issid(id: MAYBE<string>): id is string {
  return id?.startsWith('sid_') ?? false
}

const justNumberChars = customAlphabet(numbers, 4)
const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

export function createpid() {
  return `pid_${justNumberChars()}_${mixedChars()}`
}

export function ispid(id: MAYBE<string>): id is string {
  return id?.startsWith('pid_') ?? false
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
