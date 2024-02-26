import { deepClone, compare } from 'fast-json-patch'
import { isDefined, isPresent } from 'ts-extras'

export { isDefined as isdefined, isPresent as ispresent }

export function isequal(a: any, b: any) {
  return compare(a, b)
}

export function deepcopy<T>(word: T): T {
  return deepClone(word) as T
}

export function isnumber(word: any): word is number {
  return typeof word === 'number'
}

export function ismaybenumber(word: any): word is number | undefined {
  return typeof word === 'number' || word === undefined
}

export function isstring(word: any): word is string {
  return typeof word === 'string'
}

export function ismaybestring(word: any): word is string {
  return typeof word === 'string' || word === undefined
}

export function isarray(word: any): word is any[] {
  return Array.isArray(word)
}

export function ismaybearray(word: any): word is any[] | undefined {
  return Array.isArray(word) || word === undefined
}
