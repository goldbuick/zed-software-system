import { deepClone } from 'fast-json-patch'
import isEqual from 'react-fast-compare'
import { isPresent } from 'ts-extras'

export { isEqual as isequal, isPresent as ispresent }

export type MAYBE<T> = T | undefined

export function deepcopy<T>(word: T): T {
  return deepClone(word) as T
}

export function isboolean(word: any): word is boolean {
  return typeof word === 'boolean'
}

export function isnumber(word: any): word is number {
  return typeof word === 'number' && isNaN(word) === false
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

export function isbook(value: any) {
  return (
    typeof value === 'object' &&
    isstring(value.id) === true &&
    isstring(value.name) === true &&
    typeof value.flags === 'object' &&
    typeof value.players === 'object' &&
    isarray(value.pages) === true
  )
}
