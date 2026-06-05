import { createsid } from 'zss/mapping/guid'
import { MAYBE, isstring } from 'zss/mapping/types'

const boundaries = new Map<string, any>()

export function memoryboundaryget<T>(id: string): MAYBE<T> {
  return boundaries.get(id) as T
}

export function memoryboundaryset(id: string, value: any) {
  boundaries.set(id, value)
}

export function memoryboundarydelete(id: string) {
  boundaries.delete(id)
}

export function memoryboundaryalloc(value: any, maybeid?: string): string {
  const id = maybeid && isstring(maybeid) ? maybeid : createsid()
  boundaries.set(id, value)
  return id
}

export function memoryboundariesclear() {
  boundaries.clear()
}
