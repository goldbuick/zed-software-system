import { deepClone, compare } from 'fast-json-patch'
import { isDefined, isPresent } from 'ts-extras'

export { isDefined as isdefined, isPresent as ispresent }

export type MAYBE<T> = T | undefined
export type MAYBE_NUMBER = number | undefined
export type MAYBE_STRING = string | undefined

export function isequal(a: any, b: any) {
  return compare(a, b).length === 0
}

export function deepcopy<T>(word: T): T {
  return deepClone(word) as T
}

export function isnumber(word: any): word is number {
  return typeof word === 'number'
}

export function ismaybenumber(word: any): word is MAYBE<number> {
  return typeof word === 'number' || word === undefined
}

export function isstring(word: any): word is string {
  return typeof word === 'string'
}

export function ismaybestring(word: any): word is MAYBE<string> {
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
