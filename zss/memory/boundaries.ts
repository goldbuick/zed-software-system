import { createsid } from 'zss/mapping/guid'

const boundaries = new Map<string, unknown>()

export function memoryboundaryget(id: string): unknown {
  return boundaries.get(id)
}

export function memoryboundaryset(id: string, payload: unknown) {
  boundaries.set(id, payload)
}

export function memoryboundarydelete(id: string) {
  boundaries.delete(id)
}

export function memoryboundaryalloc(payload: unknown): string {
  const id = createsid()
  boundaries.set(id, payload)
  return id
}

export function memoryboundariesclear() {
  boundaries.clear()
}
