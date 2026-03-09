import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apierror, heavymodelprompt, vmagentlist } from 'zss/device/api'
import { createagent } from 'zss/feature/heavy/agent'
import { write, writeheader } from 'zss/feature/writeui'
import { isarray, ispresent } from 'zss/mapping/types'

import { agents } from '../state'

export function handleAgentstart(vm: DEVICE, message: MESSAGE): void {
  const agent = createagent()
  const id = agent.id()
  agents[id] = agent
  write(vm, message.player, `agent ${id} started`)
  vmagentlist(vm, message.player)
}

export function handleAgentstop(vm: DEVICE, message: MESSAGE): void {
  if (typeof message.data !== 'string') {
    return
  }
  const agentid = message.data
  const agent = agents[agentid]
  if (ispresent(agent)) {
    agent.stop()
    delete agents[agentid]
    write(vm, message.player, `agent ${agentid} stopped`)
    vmagentlist(vm, message.player)
  } else {
    apierror(vm, message.player, 'vm', `agent ${agentid} not found`)
  }
}

export function handleAgentlist(vm: DEVICE, message: MESSAGE): void {
  const instances = Object.values(agents)
  if (instances.length === 0) {
    write(vm, message.player, 'no agents running')
    return
  }
  writeheader(vm, message.player, 'agents')
  for (let i = 0; i < instances.length; ++i) {
    const agent = instances[i]
    write(vm, message.player, `!copyit ${agent.id()};agent ${agent.id()}`)
  }
}

export function handleAgentprompt(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [agentid, prompt] = message.data
  const agent = agents[agentid]
  if (ispresent(agent)) {
    heavymodelprompt(vm, message.player, agentid, prompt)
  } else {
    apierror(vm, message.player, 'vm', `agent ${agentid} not found`)
  }
}
