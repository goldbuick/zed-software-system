/**
 * Returns all start offsets in text where query appears (case-sensitive).
 */
export function searchintext(query: string, text: string): number[] {
  if (query.length === 0) {
    return []
  }
  const out: number[] = []
  let pos = 0
  for (;;) {
    const idx = text.indexOf(query, pos)
    if (idx === -1) break
    out.push(idx)
    pos = idx + 1
  }
  return out
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
