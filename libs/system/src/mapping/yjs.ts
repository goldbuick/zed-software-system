/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs'

import { MAYBE_ARRAY, MAYBE_MAP } from '../types'

export function createMapFromObject(object: any) {
  const map = new Y.Map<any>()

  if (typeof object === 'object') {
    Object.keys(object).forEach((key) => {
      map.set(key, object[key])
    })
  }

  return map
}

// static from<T_1 extends string | number | any[] | Uint8Array | {
//   [x: string]: any;
// } | null>(items: T_1[]): YArray<T_1>;

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
      data.map((item) => {
        return Y.Array.from([item])
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
  const items = values?.get(index) as MAYBE_ARRAY
  const length = items?.length ?? 0
  items?.push([value])
  if (length > 5) {
    items?.delete(0, length - 1)
  }
  // todo add cleanup
}

export function getMapGridValuesFromJSON(json: any): any[] {
  if (json?.values !== undefined) {
    const values = json.values as [[number]]
    return values.map((item) => item.slice(-1)[0])
  }
  return []
}
