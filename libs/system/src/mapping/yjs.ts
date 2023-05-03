import * as Y from 'yjs'

export function createMapFromObject(object: any) {
  const map = new Y.Map<any>()

  if (typeof object === 'object') {
    Object.keys(object).forEach((key) => {
      map.set(key, object[key])
    })
  }

  return map
}

/*

make util functions for creating grids of data that a memory effcient 
ie: the double nested map

the grid map, which each entry contains a map


*/

export function createMapGrid(width: number, height: number) {
  const map = new Y.Map<any>()

  return map
}
