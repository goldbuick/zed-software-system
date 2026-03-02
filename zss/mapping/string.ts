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
