import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apierror,
  heavymodelstop,
  registeragentdootoff,
  registeragentdooton,
  registerstore,
  vmpilotclear,
  workstatus,
} from 'zss/device/api'
import { createagent } from 'zss/feature/heavy/agent'
import {
  type AGENTS_ROSTER,
  AGENTS_ROSTER_STORAGE_KEY,
  MAX_ON_DEMAND_AGENTS,
  isvalidagentsroster,
} from 'zss/feature/heavy/agentsroster'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { write } from 'zss/feature/writeui'
import { zssheaderlines } from 'zss/feature/zsstextui'
import { createshortnameid } from 'zss/mapping/guid'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import type { AGENT } from './agent'

const agents: Record<string, AGENT> = {}
const agentnames: Record<string, string> = {}

function buildroster(): AGENTS_ROSTER {
  const ids = Object.keys(agents)
  return { ids, names: { ...agentnames } }
}

function persistrostertostorage(heavydev: DEVICE, requestplayer: string) {
  const roster = buildroster()
  registerstore(heavydev, requestplayer, AGENTS_ROSTER_STORAGE_KEY, roster)
}

function writeagentlistto(heavydev: DEVICE, requestplayer: string) {
  for (const line of zssheaderlines('agents')) {
    write(heavydev, requestplayer, line)
  }
  const lines: string[] = []
  const ids = Object.keys(agents)
  if (ids.length === 0) {
    lines.push('no agents running')
  } else {
    for (let i = 0; i < ids.length; ++i) {
      const id = ids[i]
      const name = readagentdisplayname(id)
      lines.push(`!copyit ${id};${name} (${id})`)
    }
  }
  terminalwritelines(heavydev, requestplayer, lines.join('\n'))
}

function readagentdisplayname(agentid: string): string {
  const n = agentnames[agentid]
  return isstring(n) ? n : agentid
}

function runningagentcount(): number {
  return Object.keys(agents).length
}

export function heavyrunagentstart(heavydev: DEVICE, message: MESSAGE): void {
  const requestplayer = message.player
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
  const agent = createagent(agentname)
  const id = agent.id()
  agents[id] = agent
  agentnames[id] = agentname
  registeragentdooton(heavydev, requestplayer, id)
  persistrostertostorage(heavydev, requestplayer)
  writeagentlistto(heavydev, requestplayer)
}

export function heavyrunagentstop(heavydev: DEVICE, message: MESSAGE): void {
  if (!isstring(message.data)) {
    return
  }
  const agentid = message.data
  const requestplayer = message.player
  if (!stopagentbyid(heavydev, agentid, requestplayer)) {
    apierror(heavydev, requestplayer, 'heavy', `agent ${agentid} not found`)
  }
}

function stopagentbyid(
  heavydev: DEVICE,
  agentid: string,
  requestplayer: string,
): boolean {
  const agent = agents[agentid]
  if (!ispresent(agent)) {
    return false
  }
  registeragentdootoff(heavydev, requestplayer, agentid)
  vmpilotclear(heavydev, requestplayer, agentid)
  heavymodelstop(heavydev, requestplayer, agentid)
  agent.stop()
  delete agents[agentid]
  delete agentnames[agentid]
  persistrostertostorage(heavydev, requestplayer)
  workstatus(heavydev, requestplayer, `agent stop ${agentid}`)
  writeagentlistto(heavydev, requestplayer)
  return true
}

export function heavyrunagentlist(heavydev: DEVICE, message: MESSAGE): void {
  writeagentlistto(heavydev, message.player)
}

export function heavyrunagentname(heavydev: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [agentid, newname] = message.data as [string, string]
  if (!isstring(agentid) || !isstring(newname)) {
    return
  }
  if (!ispresent(agents[agentid])) {
    apierror(heavydev, message.player, 'heavy', `agent ${agentid} not found`)
    return
  }
  agentnames[agentid] = newname
  persistrostertostorage(heavydev, message.player)
  workstatus(heavydev, message.player, `rename ${newname}`)
}

/** `#set user` from firmware: update heavy roster only when `agentid` is a running agent. */
export function heavyrunsyncuserdisplay(
  heavydev: DEVICE,
  message: MESSAGE,
): void {
  if (!isarray(message.data)) {
    return
  }
  const [agentid, newname] = message.data as [string, string]
  if (!isstring(agentid) || !isstring(newname)) {
    return
  }
  if (!ispresent(agents[agentid])) {
    return
  }
  agentnames[agentid] = newname
  persistrostertostorage(heavydev, message.player)
}

export function heavyrunrestoreagents(
  heavydev: DEVICE,
  message: MESSAGE,
): void {
  const roster = message.data
  if (!isvalidagentsroster(roster)) {
    return
  }
  if (runningagentcount() >= MAX_ON_DEMAND_AGENTS) {
    return
  }
  const requestplayer = message.player
  const hadextras = roster.ids.length > MAX_ON_DEMAND_AGENTS
  const restoreids = roster.ids.slice(0, MAX_ON_DEMAND_AGENTS)
  let count = 0
  for (let i = 0; i < restoreids.length; ++i) {
    const id = restoreids[i]
    if (agents[id]) {
      continue
    }
    const name = isstring(roster.names[id]) ? roster.names[id] : id
    const agent = createagent(name, id)
    agents[id] = agent
    agentnames[id] = name
    registeragentdooton(heavydev, requestplayer, id)
    count += 1
  }
  if (count > 0 || hadextras) {
    persistrostertostorage(heavydev, requestplayer)
  }
  if (count > 0) {
    if (hadextras) {
      workstatus(
        heavydev,
        requestplayer,
        'agent restore 1 (open another tab for more)',
      )
    } else {
      workstatus(heavydev, requestplayer, `agent start ${count}`)
    }
  }
}
