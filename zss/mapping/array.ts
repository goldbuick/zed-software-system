import { randominteger, randomintegerwith } from './number'
import { MAYBE, ispresent } from './types'

export function range(a: number, b?: number, step?: number) {
  if (typeof a !== 'number') {
    a = 0
    b = 0
    step = 1
  }
  if (typeof b !== 'number') {
    b = a
    a = 0
    step = 1
  }
  if (typeof step !== 'number') {
    step = 1
  }
  const list = []
  const v1 = Math.min(a, b)
  const v2 = Math.max(a, b)
  for (let i = v1; i <= v2; i += step) {
    list.push(i)
  }
  return list
}

function randomitem<T>(array: T[]) {
  return array[randominteger(0, array.length - 1)]
}

function randomitemwith<T>(seed: string, array: T[]) {
  return array[randomintegerwith(seed, 0, array.length - 1)]
}

export function pick<T>(...args: T[]) {
  return randomitem(args.flat())
}

export function pickwith<T>(seed: string, ...args: T[]) {
  return randomitemwith(seed, args.flat())
}

export function addToArray<T>(array: T[], value: T) {
  return [...array, value]
}

export function setIndex<T>(array: T[], index: number, value: T) {
  const newArray = [...array]
  newArray[index] = value
  return newArray
}

export function removeIndex<T>(array: T[], index: number) {
  const newArray = [...array]
  newArray.splice(index, 1)
  return newArray
}

export function setAtIndex<T>(array: T[], index: number, value: T) {
  const newArray = [...array]
  newArray[index] = value
  return newArray
}

export function applyToIndex<T>(
  array: Record<string, T>[],
  index: number,
  props: Record<string, T>,
) {
  const newArray = [...array]
  newArray[index] = {
    ...newArray[index],
    ...props,
  }
  return newArray
}

export function removeFromIndex<T>(
  array: Record<string, T>[],
  index: number,
  key: string,
) {
  const newArray = [...array]
  newArray[index] = { ...newArray[index] }
  delete newArray[index][key]
  return newArray
}

export function findIndexByKey<T>(
  array: Record<string, T>[],
  key: string,
  value: T,
) {
  return array.findIndex((item) => item[key] === value)
}

export function findByKey<T>(
  array: Record<string, T>[],
  key: string,
  value: T,
) {
  return array.find((item) => item[key] === value)
}

export function notEmpty<T>(value: T | null | undefined): value is T {
  if (value === null || value === undefined) {
    return false
  }
  return true
}

export function unique<T>(values: (T | undefined)[]) {
  const array = [...new Set(values)]
  return array.filter(ispresent)
}

export function average(...maybevalues: (MAYBE<number> | MAYBE<number>[])[]) {
  const values = maybevalues.flat().filter(ispresent)
  return values.reduce((acc, value) => acc + value, 0) / values.length
}
