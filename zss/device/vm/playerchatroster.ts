import type { DEVICE } from 'zss/device'
import { vmloader } from 'zss/device/api'
import {
  type CHAT_ROSTER_ENTRY,
  CHAT_ROSTER_THROTTLE_MS,
  formatchatrosterlines,
} from 'zss/device/vm/chatrosterformat'
import { lastinputtime } from 'zss/device/vm/state'
import { isstring } from 'zss/mapping/types'
import { memoryreadflags } from 'zss/memory/flags'
import {
  memoryreadbookbysoftware,
  memoryreadoperator,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

const PLAYER_ROUTEKEY = 'player'

let lastplayerrosterwire = ''
let lastplayerrosteremitms = 0

function sessionrosterentries(nowms: number): CHAT_ROSTER_ENTRY[] {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const ids = new Set<string>(mainbook?.activelist ?? [])
  const operator = memoryreadoperator()
  if (operator) {
    ids.add(operator)
  }
  const entries: CHAT_ROSTER_ENTRY[] = []
  for (const pid of ids) {
    const last = lastinputtime[pid]
    // Skip ids with no lastinputtime (logout teardown / linkdead pending).
    if (typeof last !== 'number' && pid !== operator) {
      continue
    }
    const { user } = memoryreadflags(pid)
    const name = isstring(user) && user.trim() ? user : 'player'
    entries.push({
      name,
      lastseenms: typeof last === 'number' ? last : nowms,
    })
  }
  return entries
}

export function formatplayerchatroster(nowms = Date.now()): string {
  return formatchatrosterlines(sessionrosterentries(nowms), nowms)
}

/** Emit chat:roster:player if body changed and throttle allows (or force). */
export function maybeemitplayerchatroster(
  vm: DEVICE,
  player: string,
  force = false,
): void {
  const nowms = Date.now()
  const body = formatplayerchatroster(nowms)
  if (!force && body === lastplayerrosterwire) {
    return
  }
  if (!force && nowms - lastplayerrosteremitms < CHAT_ROSTER_THROTTLE_MS) {
    return
  }
  lastplayerrosterwire = body
  lastplayerrosteremitms = nowms
  vmloader(
    vm,
    player,
    undefined,
    'text',
    `chat:roster:${PLAYER_ROUTEKEY}`,
    body,
  )
}

export function emitchatconnectplayer(vm: DEVICE, player: string): void {
  const { user } = memoryreadflags(player)
  const name = isstring(user) && user.trim() ? user : 'player'
  vmloader(
    vm,
    player,
    undefined,
    'text',
    `chat:connect:${PLAYER_ROUTEKEY}`,
    `${name}:0`,
  )
  maybeemitplayerchatroster(vm, player, true)
}

export function emitchatdisconnectplayer(vm: DEVICE, player: string): void {
  const { user } = memoryreadflags(player)
  const name = isstring(user) && user.trim() ? user : 'player'
  vmloader(
    vm,
    player,
    undefined,
    'text',
    `chat:disconnect:${PLAYER_ROUTEKEY}`,
    `${name}:0`,
  )
}

/** Test hook. */
export function resetplayerchatrosteremitsfortests(): void {
  lastplayerrosterwire = ''
  lastplayerrosteremitms = 0
}
