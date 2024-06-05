import humanid from 'human-id'
import { customAlphabet, nanoid } from 'nanoid'
import { lowercase, numbers } from 'nanoid-dictionary'

export function createsid() {
  return `sid_${nanoid().replaceAll('-', '.')}`
}

const justNumberChars = customAlphabet(numbers, 4)
const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)
export function createpid() {
  return `pid_${justNumberChars()}_${mixedChars()}`
}

export function createnameid() {
  return humanid({
    capitalize: false,
    adjectiveCount: 1,
  })
}
