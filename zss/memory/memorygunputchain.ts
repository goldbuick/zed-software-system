import { isplainobject } from 'zss/mapping/types'

/** Minimal Gun chain surface for writing projected trees (no `gun` package import). */
export type MemoryGunChain = {
  get: (k: string) => MemoryGunChain
  put: (v: unknown) => unknown
}

type PutFrame = {
  node: MemoryGunChain
  keys: string[]
  keyindex: number
  obj: Record<string, unknown>
  depth: number
}

function memorygunputseedstack(
  stack: PutFrame[],
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
  const keys = Object.keys(projected)
  stack.push({ node, keys, keyindex: 0, obj: projected, depth })
}

/**
 * Write a pre-projected wire tree (objects / scalars / null) onto a Gun chain.
 * Iterative (no deep recursion) so JS stack stays bounded; stays synchronous so `memorygunlocalskip` wraps full write.
 */
export function memorygunputprojectedtochain(
  node: MemoryGunChain,
  projected: unknown,
  depth: number,
): void {
  const stack: PutFrame[] = []
  memorygunputseedstack(stack, node, projected, depth)
  while (stack.length > 0) {
    const top = stack[stack.length - 1]
    if (top.keyindex >= top.keys.length) {
      stack.pop()
      continue
    }
    const k = top.keys[top.keyindex++]
    if (k.length === 0) {
      continue
    }
    const v = top.obj[k]
    if (v === undefined) {
      continue
    }
    const child = top.node.get(k)
    if (v === null) {
      child.put(null)
    } else if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    ) {
      child.put(v)
    } else if (isplainobject(v)) {
      memorygunputseedstack(stack, child, v, top.depth + 1)
    }
  }
}
