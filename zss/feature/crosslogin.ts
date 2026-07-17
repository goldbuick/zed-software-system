import { deepcopy } from 'zss/mapping/types'

let crossloginflags: Record<string, unknown> | undefined

/** Hold live book flags in memory for the next guest vmlogin (soft join). */
export function setcrossloginflags(flags: Record<string, unknown>): void {
  crossloginflags = deepcopy(flags)
}

export function takecrossloginflags(): Record<string, unknown> | undefined {
  const flags = crossloginflags
  crossloginflags = undefined
  return flags
}

export function clearcrossloginflags(): void {
  crossloginflags = undefined
}

export function readcrossloginflags(): Record<string, unknown> | undefined {
  return crossloginflags
}
