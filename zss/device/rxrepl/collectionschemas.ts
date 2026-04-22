/**
 * RxDB collection schemas for stream mirror (Memory / Flags / Boards / Gadget).
 * `_deleted` is required for replication; soft-delete streams set it true.
 */
export const STREAMREPL_DB_VERSION = 1

export const memoryMirrorSchema = {
  version: STREAMREPL_DB_VERSION,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    documentjson: { type: 'string' },
    rev: { type: 'number', multipleOf: 1 },
    _deleted: { type: 'boolean' },
  },
  required: ['id', 'documentjson', 'rev', '_deleted'],
} as const

export const flagsMirrorSchema = {
  version: STREAMREPL_DB_VERSION,
  primaryKey: 'player',
  type: 'object',
  properties: {
    player: { type: 'string', maxLength: 512 },
    documentjson: { type: 'string' },
    rev: { type: 'number', multipleOf: 1 },
    _deleted: { type: 'boolean' },
  },
  required: ['player', 'documentjson', 'rev', '_deleted'],
} as const

export const boardsMirrorSchema = {
  version: STREAMREPL_DB_VERSION,
  primaryKey: 'boardId',
  type: 'object',
  properties: {
    boardId: { type: 'string', maxLength: 512 },
    documentjson: { type: 'string' },
    rev: { type: 'number', multipleOf: 1 },
    _deleted: { type: 'boolean' },
  },
  required: ['boardId', 'documentjson', 'rev', '_deleted'],
} as const

export const gadgetMirrorSchema = {
  version: STREAMREPL_DB_VERSION,
  primaryKey: 'player',
  type: 'object',
  properties: {
    player: { type: 'string', maxLength: 512 },
    documentjson: { type: 'string' },
    rev: { type: 'number', multipleOf: 1 },
    _deleted: { type: 'boolean' },
  },
  required: ['player', 'documentjson', 'rev', '_deleted'],
} as const

export type MemoryMirrorRow = {
  id: string
  documentjson: string
  rev: number
  _deleted: boolean
}

export type FlagsMirrorRow = {
  player: string
  documentjson: string
  rev: number
  _deleted: boolean
}

export type BoardsMirrorRow = {
  boardId: string
  documentjson: string
  rev: number
  _deleted: boolean
}

export type GadgetMirrorRow = {
  player: string
  documentjson: string
  rev: number
  _deleted: boolean
}

/** RxDB replication checkpoint: strict order by rev then primary id string. */
export type StreamReplRxCheckpoint = {
  id: string
  rev: number
}
