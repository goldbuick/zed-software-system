import { deepClone, compare } from 'fast-json-patch'
import { isPresent } from 'ts-extras'

export { isPresent as ispresent }

export type MAYBE<T> = T | undefined
export type NUMBER_OR_STRING = number | string
export type MAYBE_NUMBER = MAYBE<number>
export type MAYBE_STRING = MAYBE<string>
export type MAYBE_NUMBER_OR_STRING = MAYBE<number | string>

export function isequal(a: any, b: any) {
  return compare(a, b).length === 0
}

export function deepcopy<T>(word: T): T {
  return deepClone(word) as T
}

export function isnumber(word: any): word is number {
  return typeof word === 'number'
}

export function ismaybenumber(word: any): word is MAYBE_NUMBER {
  return typeof word === 'number' || word === undefined
}

export function isstring(word: any): word is string {
  return typeof word === 'string'
}

export function ismaybestring(word: any): word is MAYBE_STRING {
  return typeof word === 'string' || word === undefined
}

export function isarray(word: any): word is any[] {
  return Array.isArray(word)
}

export function ismaybearray(word: any): word is MAYBE<any[]> {
  return Array.isArray(word) || word === undefined
}

export function noop<T>(item: T) {
  return item
}
