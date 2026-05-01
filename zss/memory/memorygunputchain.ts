/** Minimal Gun chain surface for writing projected trees (no `gun` package import). */
export type MemoryGunChain = {
  get: (k: string) => MemoryGunChain
  put: (v: unknown) => unknown
}

function isplainobject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as { then?: unknown }).then !== 'function'
  )
}

/** Write a pre-projected wire tree (objects / scalars / null) onto a Gun chain. */
export function memorygunputprojectedtochain(
  node: MemoryGunChain,
  projected: unknown,
  depth: number,
): void {
  if (depth > 60) {
    return
  }
  if (projected === undefined) {
    return
  }
  if (projected === null) {
    node.put(null)
    return
  }
  if (
    typeof projected === 'string' ||
    typeof projected === 'number' ||
    typeof projected === 'boolean'
  ) {
    node.put(projected)
    return
  }
  if (!isplainobject(projected)) {
    return
  }
  const o = projected as Record<string, unknown>
  const keys = Object.keys(o)
  for (let i = 0; i < keys.length; ++i) {
    const k = keys[i]!
    if (k.length === 0) {
      continue
    }
    const v = o[k]
    if (v === undefined) {
      continue
    }
    const child = node.get(k)
    if (v === null) {
      child.put(null)
      continue
    }
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    ) {
      child.put(v)
      continue
    }
    if (isplainobject(v)) {
      memorygunputprojectedtochain(child, v, depth + 1)
    }
  }
}
