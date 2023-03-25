import * as Y from 'yjs'

export type MaybeText = Y.Text | undefined
export type MaybeMap = Y.Map<any> | undefined
export type MaybeArray = Y.Array<any> | undefined

export function createMapFromObject(object: any) {
  const map = new Y.Map<any>()

  if (typeof object === 'object') {
    Object.keys(object).forEach((key) => {
      map.set(key, object[key])
    })
  }

  return map
}
