/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs'

import { MAYBE_ARRAY, MAYBE_MAP } from './types'

export function createMapFromObject(object: any) {
  const map = new Y.Map<any>()

  if (typeof object === 'object') {
    Object.keys(object).forEach((key) => {
      map.set(key, object[key])
    })
  }

  return map
}

export function createMapGrid<T extends string | number | null>(
  width: number,
  height: number,
  data: T[],
) {
  const map = new Y.Map<any>()

  map.set('width', width)
  map.set('height', height)
  map.set('values', Y.Array.from(data))

  return map
}

export function getMapGridWidth(grid: MAYBE_MAP): number {
  return grid?.get('width') ?? 0
}

export function getMapGridHeight(grid: MAYBE_MAP): number {
  return grid?.get('height') ?? 0
}

export function getMapGridValues(grid: MAYBE_MAP): MAYBE_ARRAY {
  return grid?.get('values')
}

export function setMapGridValue<T>(
  values: MAYBE_ARRAY,
  width: number,
  x: number,
  y: number,
  value: T,
) {
  values?.doc?.transact(() => {
    const index = x + y * width
    values.delete(index)
    values.insert(index, [value])
  })
}

export function getMapGridValuesArray<T>(grid: MAYBE_MAP): T[] {
  const array = grid?.get('values') as MAYBE_ARRAY
  return array?.toArray() ?? []
}

export function recycleMapGridValues(grid: MAYBE_MAP) {
  const array = grid?.get('values') as MAYBE_ARRAY
  grid?.set('values', array?.clone())
}
