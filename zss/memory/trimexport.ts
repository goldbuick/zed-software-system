import { FORMAT_OBJECT } from 'zss/feature/format'
import { MAYBE, isplainobject, ispresent } from 'zss/mapping/types'

function isplainobjectempty(value: unknown): boolean {
  return isplainobject(value) && Object.keys(value).length === 0
}

function isformatobject(value: any): value is FORMAT_OBJECT {
  if (!Array.isArray(value) || value.length === 0 || value.length % 2 !== 0) {
    return false
  }
  for (let i = 0; i < value.length; i += 2) {
    if (typeof value[i] !== 'string') {
      return false
    }
  }
  return true
}

function trimexportvalue(value: any): any {
  if (value === undefined) {
    return undefined
  }
  if (isformatobject(value)) {
    return trimformatobject(value)
  }
  if (Array.isArray(value)) {
    const out = []
    for (let i = 0; i < value.length; ++i) {
      out.push(trimexportvalue(value[i]))
    }
    return out
  }
  if (isplainobject(value)) {
    return trimmemoryexport(value)
  }
  return value
}

export function trimmemoryexport(value: any): any {
  if (value === undefined) {
    return undefined
  }
  if (!isplainobject(value)) {
    return trimexportvalue(value)
  }

  const out: Record<string, any> = {}
  const keys = Object.keys(value)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const trimmed = trimexportvalue(value[key])
    if (trimmed === undefined || isplainobjectempty(trimmed)) {
      continue
    }
    out[key] = trimmed
  }

  if (Object.keys(out).length === 0) {
    return undefined
  }
  return out
}

export function trimformatobject(
  formatted: MAYBE<FORMAT_OBJECT>,
): MAYBE<FORMAT_OBJECT> {
  if (!Array.isArray(formatted) || formatted.length === 0) {
    return undefined
  }

  const out: FORMAT_OBJECT = []
  for (let i = 0; i < formatted.length; i += 2) {
    const key = formatted[i]
    let value = formatted[i + 1]

    if (value === undefined || isplainobjectempty(value)) {
      continue
    }

    if (isformatobject(value)) {
      value = trimformatobject(value)
      if (!ispresent(value)) {
        continue
      }
    } else if (isplainobject(value)) {
      value = trimmemoryexport(value)
      if (value === undefined || isplainobjectempty(value)) {
        continue
      }
    } else if (Array.isArray(value)) {
      value = trimexportvalue(value)
    }

    out.push(key, value)
  }

  if (out.length === 0) {
    return undefined
  }
  return out
}
