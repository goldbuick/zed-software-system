import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Parse a dotenv-ish file body (supports # and // line comments). */
export function parseenvfilecontents(contents: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue
    }
    const eq = line.indexOf('=')
    if (eq <= 0) {
      continue
    }
    const key = line.slice(0, eq).trim()
    if (!ENV_KEY_RE.test(key)) {
      continue
    }
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

/**
 * Load cafe/.env then cafe/.env.local (later wins).
 * Does not read process.env — merge with taskenv() so shell/CI still override.
 */
export function loadcafeenvfiles(root: string): Record<string, string> {
  const dir = join(root, 'cafe')
  const merged: Record<string, string> = {}
  for (const name of ['.env', '.env.local']) {
    const filepath = join(dir, name)
    if (!existsSync(filepath)) {
      continue
    }
    Object.assign(merged, parseenvfilecontents(readFileSync(filepath, 'utf8')))
  }
  return merged
}

/** Cafe dotenv files first, then caller env (shell / task ctx wins). */
export function mergecafeenv(
  root: string,
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  return { ...loadcafeenvfiles(root), ...env }
}
