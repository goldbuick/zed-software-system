/**
 * Pure value ↔ Gun-wire tree: arrays become `{ $0, $1, … }` (never bare `"0"` keys).
 * `omitkey(parentpath, key)` drops keys from the wire (e.g. `board.lookup` / `board.named` — runtime-only in projection).
 * Empty JS arrays use a single-slot sentinel so `{}` stays a plain object (see `MEMORY_GUN_EMPTY_ARRAY_MARKER`).
 */
export const MEMORY_GUN_EMPTY_ARRAY_MARKER = '\uE000__gun_empty_array__'

export type MemoryGunProjectOptions = {
  omitkey?: (path: readonly string[], key: string) => boolean
}

function isplainobject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof Set) &&
    typeof (v as { then?: unknown }).then !== 'function'
  )
}

function isfinite_number(n: number): boolean {
  return Number.isFinite(n)
}

/** Default: omit `lookup` and `named` under a `board` object (path parent’s last segment is `board`). */
export function memorygunomitboardruntimekey(
  path: readonly string[],
  key: string,
): boolean {
  if (path.length === 0 || path[path.length - 1] !== 'board') {
    return false
  }
  return key === 'lookup' || key === 'named'
}

function iswirearrayshaped(o: Record<string, unknown>): boolean {
  const keys = Object.keys(o)
  if (keys.length === 0) {
    return false
  }
  for (let i = 0; i < keys.length; ++i) {
    if (!/^\$\d+$/.test(keys[i]!)) {
      return false
    }
  }
  return true
}

/**
 * JSON-like value → wire tree (no JS arrays; optional key omission).
 * Prunes: undefined, function, symbol, non-finite numbers, non-plain objects.
 */
export function memorygunprojectvalue(
  input: unknown,
  options?: MemoryGunProjectOptions,
  pathparent: readonly string[] = [],
): unknown {
  const omitkey = options?.omitkey ?? memorygunomitboardruntimekey

  if (input === null) {
    return null
  }
  if (typeof input === 'boolean') {
    return input
  }
  if (typeof input === 'number') {
    return isfinite_number(input) ? input : undefined
  }
  if (typeof input === 'string') {
    return input
  }
  if (typeof input === 'function' || typeof input === 'symbol') {
    return undefined
  }
  if (input instanceof Set) {
    return memorygunprojectvalue([...input], options, pathparent)
  }
  if (Array.isArray(input)) {
    if (input.length === 0) {
      return { $0: MEMORY_GUN_EMPTY_ARRAY_MARKER }
    }
    const out: Record<string, unknown> = {}
    for (let i = 0; i < input.length; ++i) {
      const slot = '$' + String(i)
      const projected = memorygunprojectvalue(input[i], options, [
        ...pathparent,
        slot,
      ])
      if (projected !== undefined) {
        out[slot] = projected
      }
    }
    return out
  }
  if (!isplainobject(input)) {
    return undefined
  }
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(input)) {
    if (k.length === 0) {
      continue
    }
    if (omitkey(pathparent, k)) {
      continue
    }
    const projected = memorygunprojectvalue(
      (input as Record<string, unknown>)[k],
      options,
      [...pathparent, k],
    )
    if (projected !== undefined) {
      out[k] = projected
    }
  }
  return out
}

/** Wire tree → JSON-like value (rebuild arrays from `$n` keys only). */
export function memorygununprojectvalue(wire: unknown): unknown {
  if (wire === null) {
    return null
  }
  if (
    typeof wire === 'boolean' ||
    typeof wire === 'number' ||
    typeof wire === 'string'
  ) {
    return wire
  }
  if (!isplainobject(wire)) {
    return undefined
  }
  const o = wire as Record<string, unknown>
  if (
    Object.keys(o).length === 1 &&
    o.$0 === MEMORY_GUN_EMPTY_ARRAY_MARKER
  ) {
    return []
  }
  if (iswirearrayshaped(o)) {
    const keys = Object.keys(o)
    let max = -1
    for (let i = 0; i < keys.length; ++i) {
      const n = parseInt(keys[i]!.slice(1), 10)
      if (n > max) {
        max = n
      }
    }
    const arr: unknown[] = []
    for (let i = 0; i <= max; ++i) {
      const slot = '$' + String(i)
      if (Object.prototype.hasOwnProperty.call(o, slot)) {
        arr.push(memorygununprojectvalue(o[slot]))
      } else {
        arr.push(undefined)
      }
    }
    return arr
  }
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(o)) {
    if (k === '_' || k.length === 0) {
      continue
    }
    out[k] = memorygununprojectvalue(o[k])
  }
  return out
}

/** Strip Gun `._` meta; recurse plain objects (matches gunsync stripgunmeta behavior for BOOK decode). */
export function memorygunstripmeta(v: unknown): unknown {
  if (v === null || v === undefined) {
    return v
  }
  if (typeof v !== 'object') {
    return v
  }
  if (v instanceof Set) {
    return [...v].map(memorygunstripmeta)
  }
  if (Array.isArray(v)) {
    return v.map(memorygunstripmeta)
  }
  const o = v as Record<string, unknown>
  const out: Record<string, unknown> = {}
  const keys = Object.keys(o)
  for (let i = 0; i < keys.length; ++i) {
    const k = keys[i]!
    if (k === '_' || k.length === 0) {
      continue
    }
    out[k] = memorygunstripmeta(o[k])
  }
  return out
}
