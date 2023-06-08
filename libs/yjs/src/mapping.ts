/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomInteger } from '@zss/system/mapping/number'
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

function recycleMapGridValues(grid: MAYBE_MAP) {
  // console.info('recycled', grid)
  const array = grid?.get('values') as MAYBE_ARRAY
  grid?.set('values', array?.clone())
}

function markedForRecycle(event: Y.YArrayEvent<any>) {
  const grid = event.target.parent as MAYBE_MAP
  recycleMapGridValues(grid)
}

const RECYCLE_START = 1024
const RECYCLE_END = RECYCLE_START + 512

export function setMapGridValue<T>(
  values: MAYBE_ARRAY,
  width: number,
  x: number,
  y: number,
  value: T,
) {
  const index = x + y * width
  values?.doc?.transact(() => {
    // @ts-expect-error hackin
    const writeCount = (values.writeCount || 0) + 1
    const writeLimit =
      // @ts-expect-error hackin
      values.writeLimit || randomInteger(RECYCLE_START, RECYCLE_END)

    // @ts-expect-error hackin
    if (!values.marked && writeCount > writeLimit) {
      // @ts-expect-error hackin
      values.marked = true
      values.observe(markedForRecycle)
    }

    // tag with local write count
    // @ts-expect-error hackin
    values.writeCount = writeCount
    // @ts-expect-error hackin
    values.writeLimit = writeLimit

    // write data
    values.insert(index, [value])
    values.delete(index + 1)
  })
}

export function getMapGridValuesArray<T>(grid: MAYBE_MAP): T[] {
  const array = grid?.get('values') as MAYBE_ARRAY
  return array?.toArray() ?? []
}
