import { range } from '@zss/system/mapping/array'
import { randomInteger } from '@zss/system/mapping/number'

export function createId() {
  return new Uint8Array(range(32).map(() => randomInteger(0, 255)))
}
