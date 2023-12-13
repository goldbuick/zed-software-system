import * as Y from 'yjs'

/*

What is sync ?

an abstraction on top of CRDT to enable multiplayer edit

*/

export type MAYBE_MAP = Y.Map<any> | undefined

export type MAYBE_TEXT = Y.Text | undefined

export type MAYBE_ARRAY = Y.Array<any> | undefined
