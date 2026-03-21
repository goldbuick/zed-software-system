import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apierror,
  apitoast,
  heavymodelprompt,
  heavymodelstop,
  registerstore,
  vmpilotclear,
} from 'zss/device/api'
import { createagent } from 'zss/feature/heavy/agent'
import {
  type AGENTS_ROSTER,
  AGENTS_ROSTER_STORAGE_KEY,
  isvalidagentsroster,
} from 'zss/feature/heavy/agentsroster'
import { write, writeheader } from 'zss/feature/writeui'
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
  const ids = Object.keys(agents)
  if (ids.length === 0) {
    write(heavydev, requestplayer, 'no agents running')
    return
  }
  writeheader(heavydev, requestplayer, 'agents')
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    const name = readagentdisplayname(id)
    write(heavydev, requestplayer, `!copyit ${id};${name} (${id})`)
  }
}

function readagentdisplayname(agentid: string): string {
  const n = agentnames[agentid]
  return isstring(n) ? n : agentid
}

export function heavyrunagentstart(heavydev: DEVICE, message: MESSAGE): void {
  const requestplayer = message.player
  const agentname = isstring(message.data) ? message.data : createshortnameid()
  const agent = createagent(agentname)
  const id = agent.id()
  agents[id] = agent
  agentnames[id] = agentname
  persistrostertostorage(heavydev, requestplayer)
  apitoast(heavydev, requestplayer, `agent ${agentname} (${id}) started`)
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
  vmpilotclear(heavydev, requestplayer, agentid)
  heavymodelstop(heavydev, requestplayer, agentid)
  agent.stop()
  delete agents[agentid]
  delete agentnames[agentid]
  persistrostertostorage(heavydev, requestplayer)
  apitoast(heavydev, requestplayer, `agent ${agentid} stopped`)
  writeagentlistto(heavydev, requestplayer)
  return true
}

export function heavyrunagentlist(heavydev: DEVICE, message: MESSAGE): void {
  writeagentlistto(heavydev, message.player)
}

export function heavyrunagentprompt(heavydev: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const data = message.data as [string, string, string?]
  const [agentid, prompt, promptlogging] = data
  if (!isstring(agentid) || !isstring(prompt)) {
    return
  }
  const pl = isstring(promptlogging) ? promptlogging : 'off'
  if (ispresent(agents[agentid])) {
    heavymodelprompt(
      heavydev,
      message.player,
      agentid,
      readagentdisplayname(agentid),
      prompt,
      pl,
    )
  } else {
    apierror(heavydev, message.player, 'heavy', `agent ${agentid} not found`)
  }
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
  apitoast(heavydev, message.player, `agent ${agentid} renamed to ${newname}`)
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
  const requestplayer = message.player
  let count = 0
  for (let i = 0; i < roster.ids.length; ++i) {
    const id = roster.ids[i]
    if (agents[id]) {
      continue
    }
    const name = isstring(roster.names[id]) ? roster.names[id] : id
    const agent = createagent(name, id)
    agents[id] = agent
    agentnames[id] = name
    count += 1
  }
  if (count > 0) {
    apitoast(heavydev, requestplayer, `Restored ${count} agent(s)`)
  }
  writeagentlistto(heavydev, requestplayer)
}
