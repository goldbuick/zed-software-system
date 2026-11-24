/** Book-token session listing protocol (one lister peer per book version). */
import { createinfohash, createsid } from 'zss/mapping/guid'

export const SESSIONLIST_PEER_PREFIX = 'sl_'

const SESSIONLIST_PEER_ID_RE = /^sl_[a-zA-Z0-9]{20}$/

export type SESSIONLIST_ROW = {
  topic: string
  players: number
  /** Host `#set session` display name when set. */
  name?: string
}

export type SESSIONLIST_ENTRY = SESSIONLIST_ROW & {
  updated: number
}

export type SESSIONLIST_REGISTER = {
  type: 'sessionlist:register'
  topic: string
  players: number
  name?: string
}

export type SESSIONLIST_UNREGISTER = {
  type: 'sessionlist:unregister'
}

export type SESSIONLIST_QUERY = {
  type: 'sessionlist:query'
}

export type SESSIONLIST_LIST = {
  type: 'sessionlist:list'
  sessions: SESSIONLIST_ENTRY[]
}

export type SESSIONLIST_MESSAGE =
  | SESSIONLIST_REGISTER
  | SESSIONLIST_UNREGISTER
  | SESSIONLIST_QUERY
  | SESSIONLIST_LIST

/** The only book token minter: a PeerJS id for the book version's lister. */
export function createsessionlisttoken(): string {
  return `${SESSIONLIST_PEER_PREFIX}${createinfohash(createsid())}`
}

export function issessionlistpeerid(value: unknown): value is string {
  return typeof value === 'string' && SESSIONLIST_PEER_ID_RE.test(value)
}

function isoptionalname(value: unknown): value is string | undefined {
  return (
    value === undefined || (typeof value === 'string' && value.length > 0)
  )
}

function isentry(value: unknown): value is SESSIONLIST_ENTRY {
  if (!value || typeof value !== 'object') {
    return false
  }
  const entry = value as Record<string, unknown>
  return (
    typeof entry.topic === 'string' &&
    typeof entry.players === 'number' &&
    typeof entry.updated === 'number' &&
    isoptionalname(entry.name)
  )
}

export function issessionlistmessage(
  value: unknown,
): value is SESSIONLIST_MESSAGE {
  if (!value || typeof value !== 'object') {
    return false
  }
  const msg = value as Record<string, unknown>
  switch (msg.type) {
    case 'sessionlist:register':
      return (
        typeof msg.topic === 'string' &&
        msg.topic.length > 0 &&
        typeof msg.players === 'number' &&
        isoptionalname(msg.name)
      )
    case 'sessionlist:unregister':
    case 'sessionlist:query':
      return true
    case 'sessionlist:list':
      return Array.isArray(msg.sessions) && msg.sessions.every(isentry)
    default:
      return false
  }
}
