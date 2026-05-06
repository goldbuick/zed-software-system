import { createsid } from 'zss/mapping/guid'
import { MAYBE, isstring } from 'zss/mapping/types'

const boundaries = new Map<string, unknown>()

export function memoryboundaryget<T>(id: string): MAYBE<T> {
  return boundaries.get(id) as T
}

export function memoryboundaryset(id: string, payload: unknown) {
  boundaries.set(id, payload)
}

export function memoryboundarydelete(id: string) {
  boundaries.delete(id)
}

/**
 * Store `payload` and return its boundary id. If `maybeid` is a non-empty string
 * and no entry exists yet, that key is used; otherwise a new id is generated.
 */
export function memoryboundaryalloc(
  payload: unknown,
  maybeid?: string,
): string {
  if (maybeid && isstring(maybeid)) {
    boundaries.set(maybeid, payload)
    return maybeid
  }
  const id = createsid()
  boundaries.set(id, payload)
  return id
}

export function memoryboundariesclear() {
  boundaries.clear()
}
