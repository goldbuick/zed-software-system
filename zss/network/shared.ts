import * as Y from 'yjs'

/*

What is shared ?

an abstraction on top of CRDT to enable multiplayer edit

*/

export type MAYBE_MAP = Y.Map<any> | undefined

export type MAYBE_TEXT = Y.Text | undefined

export type MAYBE_ARRAY = Y.Array<any> | undefined

export type SHARED = {
  id: () => string
}

// export function createShared(id: string) {
//   const doc = new Y.Doc({ guid: id })

//   const sync: SHARED = {
//     id() {
//       return id
//     },
//     //
//   }

//   return sync
// }
