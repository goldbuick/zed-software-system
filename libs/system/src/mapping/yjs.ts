/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs'

import { MAYBE_MAP } from '../types'

export function createMapFromObject(object: any) {
  const map = new Y.Map<any>()

  if (typeof object === 'object') {
    Object.keys(object).forEach((key) => {
      map.set(key, object[key])
    })
  }

  return map
}

export function createMapGrid<T>(width: number, height: number, data: T[]) {
  const map = new Y.Map<any>()

  map.set('width', width)
  map.set('height', height)
  for (let i = 0; i < data.length; i++) {
    map.set(i.toString(), createMapFromObject({ value: data[i] }))
  }

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
  const map = grid?.get(`${x + y * width}`) as MAYBE_MAP
  return map?.get('value') as T | undefined
}

export function setMapGridValue<T>(
  grid: MAYBE_MAP,
  width: number,
  x: number,
  y: number,
  value: T,
) {
  // const map = grid?.get(`${x + y * width}`) as MAYBE_MAP
  // map?.set('value', value)
  grid?.set(`${x + y * width}`, createMapFromObject({ value }))
}

export function getMapGridValuesFromJSON(json: JSON | undefined) {
  return Object.values(json ?? { 0: { value: 0 } }).map((item) => item.value)
}
