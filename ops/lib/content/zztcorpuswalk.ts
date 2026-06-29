import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { compileparse } from 'zss/feature/zztoop/compileparse'

export function iszztorbrd(name: string): boolean {
  return /\.(zzt|brd)$/i.test(name)
}

/** Recursively collect .zzt / .brd files under a corpus extracted tree. */
export function collectzztcorpussourcefiles(dir: string): string[] {
  const out: string[] = []
  function walk(current: string) {
    if (!existsSync(current)) {
      return
    }
    const entries = readdirSync(current, { withFileTypes: true })
    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i]
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (iszztorbrd(entry.name)) {
        out.push(full)
      }
    }
  }
  walk(dir)
  return out
}

export function compilezztoop(source: string): { ok: boolean; error?: string } {
  const result = compileparse(source)
  const ok = !(result.errors && result.errors.length > 0) && !!result.cst
  return {
    ok,
    error: ok ? undefined : result.errors?.[0]?.message,
  }
}
