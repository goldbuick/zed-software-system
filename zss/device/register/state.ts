/** Shared mutable state used by register message handlers. */

export const DOOT_RATE = 10

let keepalive = 0
let loggedin = false
let toasttimer: ReturnType<typeof setTimeout> | undefined
let workstatustimer: ReturnType<typeof setTimeout> | undefined

export function readloggedin(): boolean {
  return loggedin
}

export function setloggedin(value: boolean): void {
  loggedin = value
}

export function inckeepalive(): number {
  return ++keepalive
}

export function deckeepaliveby(rate: number): void {
  keepalive -= rate
}

export function readtoasttimer(): ReturnType<typeof setTimeout> | undefined {
  return toasttimer
}

export function settoasttimer(
  timer: ReturnType<typeof setTimeout> | undefined,
): void {
  toasttimer = timer
}

export function readworkstatustimer():
  | ReturnType<typeof setTimeout>
  | undefined {
  return workstatustimer
}

export function setworkstatustimer(
  timer: ReturnType<typeof setTimeout> | undefined,
): void {
  workstatustimer = timer
}
