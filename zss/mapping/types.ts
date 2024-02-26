import equal from 'fast-deep-equal'
import { isDefined } from 'ts-extras'

export function isdefined(word: any) {
  return isDefined(word)
}

export function isNumber(word: any): word is number {
  return typeof word === 'number'
}

export function isMaybeNumber(word: any): word is number | undefined {
  return typeof word === 'number' || word === undefined
}

export function isString(word: any): word is string {
  return typeof word === 'string'
}

export function isMaybeString(word: any): word is string {
  return typeof word === 'string' || word === undefined
}

export function isArray(word: any): word is any[] {
  return Array.isArray(word)
}

export function isMaybeArray(word: any): word is any[] | undefined {
  return Array.isArray(word) || word === undefined
}

export function isEqual(a: any, b: any) {
  return equal(a, b)
}
