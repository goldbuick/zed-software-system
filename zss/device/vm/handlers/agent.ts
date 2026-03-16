import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apierror,
  apitoast,
  heavymodelprompt,
  heavymodelstop,
  vmagentlist,
} from 'zss/device/api'
import { agentlastresponse, agents } from 'zss/device/vm/state'
import { createagent } from 'zss/feature/heavy/agent'
import { write, writeheader } from 'zss/feature/writeui'
import { createshortnameid } from 'zss/mapping/guid'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadbookflag,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { memoryreadconfig } from 'zss/memory/utilities'

import { pilotclear } from './pilot'

const AGENTLIST_FLAG_ID = 'agentlist'

export function readagentname(agentid: string): string {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const user = memoryreadbookflag(mainbook, agentid, 'user')
  return isstring(user) ? user : agentid
}

export function handleagentstart(vm: DEVICE, message: MESSAGE): void {
  const agentname = isstring(message.data) ? message.data : createshortnameid()
  const agent = createagent(agentname)
  const id = agent.id()
  agents[id] = agent

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  memorywritebookflag(mainbook, id, 'user', agentname)
  const running =
    (memoryreadbookflag(mainbook, AGENTLIST_FLAG_ID, 'running') as
      | string[]
      | undefined) ?? []
  const updated = isarray(running) ? [...running, id] : [id]
  memorywritebookflag(mainbook, AGENTLIST_FLAG_ID, 'running', updated)

  apitoast(vm, message.player, `agent ${agentname} (${id}) started`)
  vmagentlist(vm, message.player)
}

export function handleagentstop(vm: DEVICE, message: MESSAGE): void {
  if (typeof message.data !== 'string') {
    return
  }
  const agentid = message.data
  const agent = agents[agentid]
  if (ispresent(agent)) {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const running =
      (memoryreadbookflag(mainbook, AGENTLIST_FLAG_ID, 'running') as
        | string[]
        | undefined) ?? []
    const updated = isarray(running) ? running.filter((x) => x !== agentid) : []
    memorywritebookflag(mainbook, AGENTLIST_FLAG_ID, 'running', updated)
    pilotclear(agentid)
    heavymodelstop(vm, message.player, agentid)
    agent.stop()
    delete agents[agentid]
    delete agentlastresponse[agentid]
    apitoast(vm, message.player, `agent ${agentid} stopped`)
    vmagentlist(vm, message.player)
  } else {
    apierror(vm, message.player, 'vm', `agent ${agentid} not found`)
  }
}

export function handleagentlist(vm: DEVICE, message: MESSAGE): void {
  const instances = Object.values(agents)
  if (instances.length === 0) {
    write(vm, message.player, 'no agents running')
    return
  }
  writeheader(vm, message.player, 'agents')
  for (let i = 0; i < instances.length; ++i) {
    const agent = instances[i]
    const name = readagentname(agent.id())
    write(vm, message.player, `!copyit ${agent.id()};${name} (${agent.id()})`)
  }
}

export function handleagentprompt(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [agentid, prompt] = message.data
  const agent = agents[agentid]
  if (ispresent(agent)) {
    heavymodelprompt(
      vm,
      message.player,
      agentid,
      readagentname(agentid),
      prompt,
      memoryreadconfig('promptlogging'),
    )
  } else {
    apierror(vm, message.player, 'vm', `agent ${agentid} not found`)
  }
}

export function handleagentname(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [agentid, newname] = message.data as [string, string]
  const agent = agents[agentid]
  if (!ispresent(agent)) {
    apierror(vm, message.player, 'vm', `agent ${agentid} not found`)
    return
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  memorywritebookflag(mainbook, agentid, 'user', newname)
  apitoast(vm, message.player, `agent ${agentid} renamed to ${newname}`)
}

export function restoreagentsfrommainbook(vm: DEVICE, player: string): void {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const raw = memoryreadbookflag(mainbook, AGENTLIST_FLAG_ID, 'running')
  const running = isarray(raw) ? (raw as string[]) : []
  if (running.length === 0) {
    return
  }
  let count = 0
  for (let i = 0; i < running.length; ++i) {
    const id = running[i]
    if (agents[id]) {
      continue
    }
    const user = memoryreadbookflag(mainbook, id, 'user')
    const name = isstring(user) ? user : id
    const agent = createagent(name, id)
    agents[id] = agent
    count += 1
  }
  if (count > 0) {
    apitoast(vm, player, `Restored ${count} agent(s)`)
  }
  vmagentlist(vm, player)
}
