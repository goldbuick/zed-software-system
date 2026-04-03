import { MAYBE, ispresent } from 'zss/mapping/types'
import { BOARD_SIZE } from 'zss/memory/types'

/**
 * Fixed-length `number[]` pool for board-sized buffers (`BOARD_SIZE` = 60×25).
 *
 * **Hybrid with `renderinglayercache`:** the keyed layer cache still provides
 * stable `LAYER` identity per slot. On a cache **miss**, we acquire arrays
 * from this pool instead of allocating fresh `Array(BOARD_SIZE)`. On cache
 * **eviction**, we return those backing arrays here so churn stays bounded
 * without relying on the GC for every evicted layer.
 */

const MAX_POOLED_BOARD_ARRAYS = 128
const pool: number[][] = []

export function acquireboardsizearray(fill: number): number[] {
  const arr = pool.pop() as MAYBE<number[]>
  if (ispresent(arr) && arr.length === BOARD_SIZE) {
    arr.fill(fill)
    return arr
  }
  return new Array(BOARD_SIZE).fill(fill)
}

export function releaseboardsizearray(arr: MAYBE<number[]>) {
  if (!ispresent(arr) || arr.length !== BOARD_SIZE) {
    return
  }
  if (pool.length >= MAX_POOLED_BOARD_ARRAYS) {
    return
  }
  pool.push(arr)
}
