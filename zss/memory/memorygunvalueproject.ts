import { isplainobject as ismappingplainobject } from 'zss/mapping/types'

/**
 * Pure value ↔ Gun-wire tree: arrays become `{ $0, $1, … }` (never bare `"0"` keys).
 * `omitkey(path, key)` drops keys from the wire (e.g. `board.lookup` / `board.named` — runtime-only in projection).
 * Empty JS arrays use `{ $0: null }` on wire; legacy sentinel `MEMORY_GUN_EMPTY_ARRAY_MARKER` still unprojects to `[]`.
 * `Uint8Array` uses a single reserved key + base64 payload (see `MEMORY_GUN_UINT8ARRAY_WIRE`).
 */
export const MEMORY_GUN_EMPTY_ARRAY_MARKER = '\uE000__gun_empty_array__'

/** Reserved object key for wire encoding of `Uint8Array` (must not be stripped as Gun `._`). */
export const MEMORY_GUN_UINT8ARRAY_WIRE = '\uE001__zed_uint8'

/** Max nesting depth for projection (guards runaway recursion / pathological graphs). */
export const MEMORY_GUN_PROJECT_MAX_DEPTH = 96

function isplainobject(v: unknown): v is Record<string, unknown> {
  return (
    ismappingplainobject(v) && !(v instanceof Set) && !(v instanceof Uint8Array)
  )
}

function isfinite_number(n: number): boolean {
  return Number.isFinite(n)
}

function memorygunencodeuint8base64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    ).toString('base64')
  }
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    )
  }
  return btoa(binary)
}

function memorygundecodeuint8base64(text: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(text, 'base64'))
  }
  const bin = atob(text)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i)
  }
  return out
}

/** Default: omit `lookup` and `named` under a `board` object (path parent’s last segment is `board`). */
export function memorygunskipruntime(
  path: readonly string[],
  key: string,
): boolean {
  if (path.length === 0 || path[path.length - 1] !== 'board') {
    return false
  }
  return key === 'lookup' || key === 'named'
}

/** Book/replica wire: only `id` and `code` on a `CODE_PAGE` root; delegates under `board` to `memorygunskipruntime`. */
export function memorygunskipcodepagewire(
  path: readonly string[],
  key: string,
): boolean {
  if (path.length === 0) {
    return key !== 'id' && key !== 'code'
  }
  return memorygunskipruntime(path, key)
}

function iswirearrayshaped(o: Record<string, unknown>): boolean {
  const keys = Object.keys(o)
  if (keys.length === 0) {
    return false
  }
  for (let i = 0; i < keys.length; ++i) {
    if (!/^\$\d+$/.test(keys[i])) {
      return false
    }
  }
  return true
}

function isuint8wiretag(o: Record<string, unknown>): boolean {
  const keys = Object.keys(o)
  return (
    keys.length === 1 &&
    keys[0] === MEMORY_GUN_UINT8ARRAY_WIRE &&
    typeof o[MEMORY_GUN_UINT8ARRAY_WIRE] === 'string'
  )
}

/**
 * JSON-like value → wire tree (no JS arrays; optional key omission).
 * Prunes: undefined, function, symbol, non-finite numbers, non-plain objects.
 * Breaks reference cycles on objects/arrays; caps depth at {@link MEMORY_GUN_PROJECT_MAX_DEPTH}.
 */
export function memorygunprojectvalue(
  input: unknown,
  pathparent: readonly string[] = [],
  omitkey?: (path: readonly string[], key: string) => boolean,
  depth = 0,
  visiting?: WeakSet<object>,
): unknown {
  if (depth > MEMORY_GUN_PROJECT_MAX_DEPTH) {
    return undefined
  }
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
  if (input instanceof Uint8Array) {
    return {
      [MEMORY_GUN_UINT8ARRAY_WIRE]: memorygunencodeuint8base64(input),
    }
  }
  if (input instanceof Set) {
    return memorygunprojectvalue(
      [...input],
      pathparent,
      omitkey,
      depth,
      visiting,
    )
  }
  if (Array.isArray(input)) {
    const vis = visiting ?? new WeakSet<object>()
    if (vis.has(input)) {
      return undefined
    }
    vis.add(input)
    try {
      if (input.length === 0) {
        return { $0: null }
      }
      const out: Record<string, unknown> = {}
      for (let i = 0; i < input.length; ++i) {
        const slot = '$' + String(i)
        const projected = memorygunprojectvalue(
          input[i],
          [...pathparent, slot] as readonly string[],
          omitkey,
          depth + 1,
          vis,
        )
        if (projected !== undefined) {
          out[slot] = projected
        }
      }
      return out
    } finally {
      vis.delete(input)
    }
  }
  if (!isplainobject(input)) {
    return undefined
  }
  const vis = visiting ?? new WeakSet<object>()
  if (vis.has(input)) {
    return undefined
  }
  vis.add(input)
  try {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(input)) {
      if (k.length === 0) {
        continue
      }
      if (omitkey?.(pathparent, k)) {
        continue
      }
      const projected = memorygunprojectvalue(
        input[k],
        [...pathparent, k],
        omitkey,
        depth + 1,
        vis,
      )
      if (projected !== undefined) {
        out[k] = projected
      }
    }
    return out
  } finally {
    vis.delete(input)
  }
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
  const o = wire
  if (isuint8wiretag(o)) {
    return memorygundecodeuint8base64(o[MEMORY_GUN_UINT8ARRAY_WIRE] as string)
  }
  if (Object.keys(o).length === 1 && o.$0 === MEMORY_GUN_EMPTY_ARRAY_MARKER) {
    return []
  }
  if (Object.keys(o).length === 1 && o.$0 === null) {
    return []
  }
  if (iswirearrayshaped(o)) {
    const keys = Object.keys(o)
    let max = -1
    for (let i = 0; i < keys.length; ++i) {
      const n = parseInt(keys[i].slice(1), 10)
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
