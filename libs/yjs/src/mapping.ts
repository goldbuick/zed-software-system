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
  map.set(
    'values',
    Y.Array.from(
      data.map((value, index) => {
        return { value, index }
      }),
    ),
  )

  return map
}

export function getMapGridWidth(grid: MAYBE_MAP): number {
  return grid?.get('width') ?? 0
}

export function getMapGridHeight(grid: MAYBE_MAP): number {
  return grid?.get('height') ?? 0
}

export function getMapGridValue<T>(
  grid: MAYBE_MAP,
  width: number,
  x: number,
  y: number,
): T | undefined {
  const index = x + y * width
  const array = grid?.get('values') as MAYBE_ARRAY
  return array?.get(index) as T | undefined
}

export function setMapGridValue<T>(
  grid: MAYBE_MAP,
  width: number,
  x: number,
  y: number,
  value: T,
) {
  const index = x + y * width
  const values = grid?.get('values') as MAYBE_ARRAY
  // @ts-expect-error doot
  values?.push({ value, index })
}

export function getMapGridValues<T>(grid: MAYBE_MAP) {
  const width = getMapGridWidth(grid)
  const height = getMapGridHeight(grid)
  const array = grid?.get('values') as MAYBE_ARRAY

  const values: T[] = new Array(width * height || 1).fill(undefined)

  if (array) {
    for (const item of array) {
      // todo, detect dupes
      values[item.index] = item.value
    }
  }

  return values
}
