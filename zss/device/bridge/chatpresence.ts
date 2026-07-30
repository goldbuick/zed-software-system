import {
  type CHAT_ROSTER_ENTRY,
  CHAT_ROSTER_THROTTLE_MS,
  formatchatrosterlines,
  sanitizechatrostername,
} from 'zss/device/vm/chatrosterformat'

/** routekey -> username -> lastSeenMs */
const presence = new Map<string, Map<string, number>>()
/** routekey -> last emit ms */
const lastemitms = new Map<string, number>()

export function chatpresencetouch(
  routekey: string,
  user: string,
  nowms: number,
): void {
  if (!routekey) {
    return
  }
  const name = sanitizechatrostername(user)
  let map = presence.get(routekey)
  if (!map) {
    map = new Map()
    presence.set(routekey, map)
  }
  map.set(name, nowms)
}

export function chatpresenceclear(routekey: string): void {
  presence.delete(routekey)
  lastemitms.delete(routekey)
}

export function chatpresenceformat(routekey: string, nowms: number): string {
  const map = presence.get(routekey)
  if (!map || map.size === 0) {
    return ''
  }
  const entries: CHAT_ROSTER_ENTRY[] = []
  for (const [name, lastseenms] of map) {
    entries.push({ name, lastseenms })
  }
  return formatchatrosterlines(entries, nowms)
}

/** True if enough time has passed since last roster emit for this routekey. */
export function chatpresenceshouldemit(
  routekey: string,
  nowms: number,
): boolean {
  const last = lastemitms.get(routekey) ?? 0
  return nowms - last >= CHAT_ROSTER_THROTTLE_MS
}

export function chatpresencemarkemit(routekey: string, nowms: number): void {
  lastemitms.set(routekey, nowms)
}

/** Test hook. */
export function resetchatpresencefortests(): void {
  presence.clear()
  lastemitms.clear()
}
