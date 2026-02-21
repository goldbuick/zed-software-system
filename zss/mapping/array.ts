import { randominteger, randomintegerwith, randomnumber } from './number'
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

export function pickwithweights<T>(tuples: [T, number][]): T | undefined {
  const total = tuples.reduce((sum, [, w]) => sum + w, 0)
  if (total <= 0) return undefined
  let r = randomnumber() * total
  for (const [value, weight] of tuples) {
    r -= weight
    if (r <= 0) return value
  }
  return tuples[tuples.length - 1]?.[0]
}

export function shuffle<T>(array: T[]): T[] {
  const out = [...array]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(randomnumber() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

export function shufflewithweights<T>(tuples: [T, number][]): T[] {
  const remaining = tuples.map((t) => [...t] as [T, number])
  const result: T[] = []
  while (remaining.length > 0) {
    const total = remaining.reduce((sum, [, w]) => sum + w, 0)
    if (total <= 0) break
    let r = randomnumber() * total
    let idx = remaining.length - 1
    for (let i = 0; i < remaining.length; i++) {
      r -= remaining[i][1]
      if (r <= 0) {
        idx = i
        break
      }
    }
    result.push(remaining[idx][0])
    remaining.splice(idx, 1)
  }
  return result
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
