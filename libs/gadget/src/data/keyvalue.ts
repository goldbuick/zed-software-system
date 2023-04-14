/* eslint-disable @typescript-eslint/no-explicit-any */
import { nanoid } from 'nanoid'
import { YKeyValue } from 'y-utility/y-keyvalue'
import * as Y from 'yjs'

const keyValues: Record<string, YKeyValue<any>> = {}

export function createKeyValue() {
  const id = nanoid()
  const data = new Y.Array<{ key: string; val: any }>()
  const keyValue = new YKeyValue<any>(data)
  keyValues[id] = keyValue
  return { id, data, keyValue }
}

export function getKeyValue(id: string): YKeyValue<any> | undefined {
  return keyValues[id]
}

export function destroyKeyValue(id: string) {
  delete keyValues[id]
}
