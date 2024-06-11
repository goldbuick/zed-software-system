import { ispresent } from './types'

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
  const [maybetarget, maybelabel] = scope.split(':')

  const target = ispresent(maybelabel) ? maybetarget : 'self'
  const label = ispresent(maybelabel) ? maybelabel : scope

  return [target, label]
}
