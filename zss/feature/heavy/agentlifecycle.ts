import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apierror,
  heavymodelstop,
  registerstore,
  vmpilotclear,
  workstatus,
} from 'zss/device/api'
import {
  type AGENTS_ROSTER,
  AGENTS_ROSTER_STORAGE_KEY,
  MAX_ON_DEMAND_AGENTS,
  migrateroster,
} from 'zss/feature/heavy/agentsroster'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { write } from 'zss/feature/writeui'
import { zssheaderlines } from 'zss/feature/zsstextui'
import { createshortnameid } from 'zss/mapping/guid'
import { ispresent, isstring } from 'zss/mapping/types'

type AGENT_SESSION = {
  name: string
}

const sessions: Record<string, AGENT_SESSION> = {}

function buildroster(requestplayer: string): AGENTS_ROSTER | undefined {
  const session = sessions[requestplayer]
  if (!ispresent(session)) {
    return undefined
  }
  return { name: session.name }
}

function persistrostertostorage(heavydev: DEVICE, requestplayer: string) {
  const roster = buildroster(requestplayer)
  if (!ispresent(roster)) {
    registerstore(heavydev, requestplayer, AGENTS_ROSTER_STORAGE_KEY, null)
    return
  }
  registerstore(heavydev, requestplayer, AGENTS_ROSTER_STORAGE_KEY, roster)
}

function writeagentlistto(heavydev: DEVICE, requestplayer: string) {
  for (const line of zssheaderlines('agents')) {
    write(heavydev, requestplayer, line)
  }
  const lines: string[] = []
  const session = sessions[requestplayer]
  if (!ispresent(session)) {
    lines.push('no agents running')
  } else {
    lines.push(`!copyit ${requestplayer};${session.name} (running)`)
  }
  terminalwritelines(heavydev, requestplayer, lines.join('\n'))
}

function runningagentcount(): number {
  return Object.keys(sessions).length
}

export function hasagentsession(requestplayer: string): boolean {
  return ispresent(sessions[requestplayer])
}

export function readagentdisplayname(
  requestplayer: string,
): string | undefined {
  return sessions[requestplayer]?.name
}

/** Clears in-memory sessions (unit tests only). */
export function resetagentsessionsfortest(): void {
  for (const key of Object.keys(sessions)) {
    delete sessions[key]
  }
}

export function heavyrunagentstart(heavydev: DEVICE, message: MESSAGE): void {
  const requestplayer = message.player
  if (hasagentsession(requestplayer)) {
    apierror(heavydev, requestplayer, 'agent', 'agent already running')
    return
  }
  if (runningagentcount() >= MAX_ON_DEMAND_AGENTS) {
    apierror(
      heavydev,
      requestplayer,
      'agent',
      'only one agent per tab; stop it or open another tab',
    )
    return
  }
  const agentname = isstring(message.data) ? message.data : createshortnameid()
  sessions[requestplayer] = { name: agentname }
  persistrostertostorage(heavydev, requestplayer)
  writeagentlistto(heavydev, requestplayer)
  workstatus(heavydev, requestplayer, `agent start ${agentname}`)
}

export function heavyrunagentstop(heavydev: DEVICE, message: MESSAGE): void {
  const requestplayer = message.player
  const stopid = isstring(message.data) ? message.data : requestplayer
  if (!stopsession(heavydev, stopid, requestplayer)) {
    apierror(heavydev, requestplayer, 'heavy', 'agent not running')
  }
}

function stopsession(
  heavydev: DEVICE,
  stopid: string,
  requestplayer: string,
): boolean {
  const player =
    stopid === requestplayer || hasagentsession(stopid) ? stopid : requestplayer
  if (!hasagentsession(player)) {
    return false
  }
  vmpilotclear(heavydev, requestplayer, player)
  heavymodelstop(heavydev, requestplayer, player)
  delete sessions[player]
  persistrostertostorage(heavydev, requestplayer)
  workstatus(heavydev, requestplayer, 'agent stop')
  writeagentlistto(heavydev, requestplayer)
  return true
}

export function heavyrunagentlist(heavydev: DEVICE, message: MESSAGE): void {
  writeagentlistto(heavydev, message.player)
}

export function heavyrunrestoreagents(
  heavydev: DEVICE,
  message: MESSAGE,
): void {
  const roster = migrateroster(message.data)
  if (!ispresent(roster)) {
    return
  }
  if (runningagentcount() >= MAX_ON_DEMAND_AGENTS) {
    return
  }
  const requestplayer = message.player
  if (hasagentsession(requestplayer)) {
    return
  }
  sessions[requestplayer] = { name: roster.name }
  persistrostertostorage(heavydev, requestplayer)
  workstatus(heavydev, requestplayer, `agent start ${roster.name}`)
}
