import { MAYBE } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

/**
 * Read `hint:` from YAML front matter. Supports plain scalars and JSON double-quoted strings.
 */
export function romhintfrommarkdown(content: string): MAYBE<string> {
  const trimmed = content.trimStart()
  const m = FRONT_MATTER_RE.exec(trimmed)
  if (m) {
    const hint = romhintparseyamlblock(m[1] ?? '')
    if (hint !== undefined) {
      return hint
    }
  }
  return romhintlegacydesc(content)
}

function romhintparseyamlblock(block: string): MAYBE<string> {
  const lines = block.split(/\r?\n/)
  for (let i = 0; i < lines.length; ++i) {
    const t = lines[i].trim()
    if (!t || t.startsWith('#')) {
      continue
    }
    if (!t.toLowerCase().startsWith('hint:')) {
      continue
    }
    const v = t.slice(5).trim()
    if (v.startsWith('"')) {
      try {
        return JSON.parse(v) as string
      } catch {
        return undefined
      }
    }
    if (v.startsWith("'")) {
      if (v.length >= 2 && v.endsWith("'")) {
        return v.slice(1, -1).replace(/''/g, "'")
      }
      return v.slice(1)
    }
    return v
  }
  return undefined
}

/** First line `desc;value` when no front matter (legacy ROM). */
function romhintlegacydesc(content: string): MAYBE<string> {
  const first = (content.split(/\r?\n/)[0] ?? '').trimEnd()
  const parts = first.split(';')
  if (parts.length < 2) {
    return undefined
  }
  if (NAME(parts[0].trim()) !== 'desc') {
    return undefined
  }
  return parts.slice(1).join(';')
}
