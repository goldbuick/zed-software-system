import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apierror,
  apitoast,
  heavymodelprompt,
  heavymodelstop,
  vmagentlist,
  vmloader,
} from 'zss/device/api'
import { agentlastresponse, agents } from 'zss/device/vm/state'
import { createagent } from 'zss/feature/heavy/agent'
import { write, writeheader } from 'zss/feature/writeui'
import { createshortnameid } from 'zss/mapping/guid'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardoperations'
import { memorywritebookflag } from 'zss/memory/bookoperations'
import { memorysendtolog } from 'zss/memory/gamesend'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

export function handleagentstart(vm: DEVICE, message: MESSAGE): void {
  const agentname = isstring(message.data) ? message.data : createshortnameid()
  const agent = createagent(agentname)
  const id = agent.id()
  agents[id] = agent

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  memorywritebookflag(mainbook, id, 'user', agentname)

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
    write(
      vm,
      message.player,
      `!copyit ${agent.id()};${agent.name()} (${agent.id()})`,
    )
  }
}

export function handleagentprompt(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [agentid, prompt] = message.data
  const agent = agents[agentid]
  if (ispresent(agent)) {
    heavymodelprompt(vm, message.player, agentid, agent.name(), prompt)
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
  agent.setname(newname)
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  memorywritebookflag(mainbook, agentid, 'user', newname)
  apitoast(vm, message.player, `agent ${agentid} renamed to ${newname}`)
}

export function handleagentresponse(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [agentid, response] = message.data as [string, string]
  const agent = agents[agentid]
  if (!ispresent(agent)) {
    return
  }

  const reply = isstring(response) ? response : ''
  const board = memoryreadplayerboard(agentid)
  const element = memoryreadobject(board, agentid)
  if (!ispresent(board) || !ispresent(element)) {
    return
  }

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  element.tickertext = reply
  element.tickertime = mainbook?.timestamp ?? 0
  memorysendtolog(board.id, element, reply)

  agentlastresponse[agentid] = Date.now()

  vmloader(
    vm,
    agentid,
    undefined,
    'text',
    `chat:message:${board.id}`,
    `${agent.name()}:${reply}`,
  )
}
