/**
 * Session-level memo for deterministic codepage picks by (type, address).
 * Multi-match shuffle/inorder/pick results are not cached.
 */
import { MAYBE } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { CODE_PAGE, CODE_PAGE_TYPE } from './types'

const MISS = Symbol('codepagepickmiss')

type PICK_ENTRY = CODE_PAGE | typeof MISS

const pickcache = new Map<string, PICK_ENTRY>()

function pickcachekey(type: CODE_PAGE_TYPE, address: string): string {
  return `${type}:${NAME(address)}`
}

export function memoryreadcodepagepickcache(
  type: CODE_PAGE_TYPE,
  address: string,
): { hit: true; page: MAYBE<CODE_PAGE> } | { hit: false } {
  const key = pickcachekey(type, address)
  if (!pickcache.has(key)) {
    return { hit: false }
  }
  const entry = pickcache.get(key)
  if (entry === MISS) {
    return { hit: true, page: undefined }
  }
  return { hit: true, page: entry }
}

export function memorywritecodepagepickcache(
  type: CODE_PAGE_TYPE,
  address: string,
  page: MAYBE<CODE_PAGE>,
): void {
  const key = pickcachekey(type, address)
  if (page) {
    pickcache.set(key, page)
  } else {
    pickcache.set(key, MISS)
  }
}

export function memoryinvalidatecodepagepickcache(): void {
  pickcache.clear()
}
