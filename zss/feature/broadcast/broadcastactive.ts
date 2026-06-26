/** Worker-safe broadcast session flag (no bridge.ts / React imports). */

let broadcastactive = false

export function setbroadcastactive(active: boolean) {
  broadcastactive = active
}

export function readbroadcastactive(): boolean {
  return broadcastactive
}
