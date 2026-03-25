import Fuse from 'fuse.js'

/** Zed `NumberLiteral` for ASCII `;` (59); use inside `!left;right` when payload or label contains a semicolon. */
const ZED_SCROLL_SEMI_LITERAL = '$59'

/** Escape `;` for storage in the command or label segment of a bang scroll / tape line. */
export function scrolllinkescapefrag(s: string): string {
  return s.replaceAll(';', ZED_SCROLL_SEMI_LITERAL)
}

/** Undo `scrolllinkescapefrag` after splitting on the first raw `;`. `$590` etc. stay unchanged. */
export function scrolllinkunescapefrag(s: string): string {
  return s.replace(/\$59(?!\d)/g, ';')
}

const SEARCHINTEXT_KEY = 't'

/**
 * Returns all start offsets in text where query fuzzily matches (case-insensitive by default).
 */
export function searchintext(query: string, text: string): number[] {
  if (query.length === 0) {
    return []
  }
  const fuse = new Fuse([{ [SEARCHINTEXT_KEY]: text }], {
    keys: [SEARCHINTEXT_KEY],
    includeMatches: true,
    ignoreLocation: true,
    threshold: 0.6,
  })
  const results = fuse.search(query)
  const starts = new Set<number>()
  for (const result of results) {
    const matches = result.matches
    if (!matches) {
      continue
    }
    for (const match of matches) {
      const indices = match.indices
      if (!indices) {
        continue
      }
      for (const [start] of indices) {
        starts.add(start)
      }
    }
  }
  return [...starts].sort((a, b) => a - b)
}

export function stringsplice(
  str: string,
  index: number,
  count: number,
  insert?: string,
) {
  const a = str.slice(0, index)
  const b = str.slice(index + count)
  return `${a}${insert ?? ''}${b}`
}

export function totarget(scope: string) {
  // determine target of send
  const parts = scope.split(':')
  const maybetarget = parts[0]
  const rest = parts.slice(1)
  const haslabel = rest.length > 0

  const target = haslabel ? maybetarget : 'self'
  const label = haslabel ? rest.join(':') : scope

  return [target, label]
}

export function parsetarget(scope: string): { target: string; path: string } {
  const [target, path] = totarget(scope)
  return { target, path }
}
