import { MAYBE } from 'zss/mapping/types'

/**
 * While applying `memory` stream hydration on a boardrunner worker, preserve
 * `boardId_synth` when the snapshot omits it (see `mergeflagspreservingvolatile`).
 * Set from the device boardrunner when `ownedboard` is established; clear when not assigned.
 */
let mergesynthpreserveboard: MAYBE<string> = undefined

export function memorysetmergesynthpreserveboard(address: MAYBE<string>): void {
  mergesynthpreserveboard = address
}

export function memoryreadmergesynthpreserveboard(): MAYBE<string> {
  return mergesynthpreserveboard
}
