export type EDITOR_FIND_MATCH = {
  start: number
  end: number
}

function foldcase(value: string, casesensitive: boolean): string {
  return casesensitive ? value : value.toLowerCase()
}

/** Non-overlapping literal matches; empty query yields none. */
export function editorfindmatches(
  text: string,
  query: string,
  casesensitive: boolean,
): EDITOR_FIND_MATCH[] {
  if (query.length === 0) {
    return []
  }
  const hay = foldcase(text, casesensitive)
  const needle = foldcase(query, casesensitive)
  const matches: EDITOR_FIND_MATCH[] = []
  let from = 0
  while (from <= hay.length - needle.length) {
    const at = hay.indexOf(needle, from)
    if (at < 0) {
      break
    }
    matches.push({ start: at, end: at + query.length })
    from = at + Math.max(1, query.length)
  }
  return matches
}

/**
 * Next match at or after `fromcursor` (exclusive of a match that starts before
 * and ends at/after cursor when advancing). Wraps to first when none remain.
 */
export function editorfindnext(
  matches: EDITOR_FIND_MATCH[],
  fromcursor: number,
  wrap = true,
): EDITOR_FIND_MATCH | undefined {
  if (matches.length === 0) {
    return undefined
  }
  for (let i = 0; i < matches.length; ++i) {
    if (matches[i].start >= fromcursor) {
      return matches[i]
    }
  }
  return wrap ? matches[0] : undefined
}

/** Previous match ending at or before `fromcursor`; wraps to last. */
export function editorfindprev(
  matches: EDITOR_FIND_MATCH[],
  fromcursor: number,
  wrap = true,
): EDITOR_FIND_MATCH | undefined {
  if (matches.length === 0) {
    return undefined
  }
  for (let i = matches.length - 1; i >= 0; --i) {
    if (matches[i].start < fromcursor) {
      return matches[i]
    }
  }
  return wrap ? matches[matches.length - 1] : undefined
}

/** Index of match covering `cursor`, or -1. Prefer exact start match. */
export function editorfindmatchindex(
  matches: EDITOR_FIND_MATCH[],
  cursor: number,
  select: number | undefined,
): number {
  if (matches.length === 0) {
    return -1
  }
  if (typeof select === 'number') {
    const a = Math.min(cursor, select)
    const b = Math.max(cursor, select)
    for (let i = 0; i < matches.length; ++i) {
      if (matches[i].start === a && matches[i].end === b) {
        return i
      }
    }
  }
  for (let i = 0; i < matches.length; ++i) {
    if (matches[i].start === cursor) {
      return i
    }
  }
  for (let i = 0; i < matches.length; ++i) {
    if (cursor >= matches[i].start && cursor < matches[i].end) {
      return i
    }
  }
  return -1
}

export function editorreplaceat(
  text: string,
  match: EDITOR_FIND_MATCH,
  replacement: string,
): { text: string; cursor: number } {
  const next = text.slice(0, match.start) + replacement + text.slice(match.end)
  return { text: next, cursor: match.start + replacement.length }
}

export function editorreplaceall(
  text: string,
  query: string,
  replacement: string,
  casesensitive: boolean,
): { text: string; count: number } {
  const matches = editorfindmatches(text, query, casesensitive)
  if (matches.length === 0) {
    return { text, count: 0 }
  }
  let out = ''
  let cursor = 0
  for (let i = 0; i < matches.length; ++i) {
    const m = matches[i]
    out += text.slice(cursor, m.start)
    out += replacement
    cursor = m.end
  }
  out += text.slice(cursor)
  return { text: out, count: matches.length }
}
