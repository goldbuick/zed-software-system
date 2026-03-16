import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apierror,
  apitoast,
  heavymodelprompt,
  heavymodelstop,
  vmagentlist,
  vmcli,
} from 'zss/device/api'
import { agentlastresponse, agents } from 'zss/device/vm/state'
import { createagent } from 'zss/feature/heavy/agent'
import { write, writeheader } from 'zss/feature/writeui'
import { doasync } from 'zss/mapping/func'
import { createshortnameid } from 'zss/mapping/guid'
import { waitfor } from 'zss/mapping/tick'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardoperations'
import {
  memoryreadbookflag,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { memoryreadconfig } from 'zss/memory/utilities'

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

export function handleagentresponse(vm: DEVICE, message: MESSAGE): void {
  if (!isstring(message.data)) {
    return
  }
  const response = message.data
  const agentid = message.player

  // check if agent exists
  const agent = agents[agentid]
  if (!ispresent(agent)) {
    return
  }

  // get reply and board/element
  const reply = isstring(response) ? response : ''
  const board = memoryreadplayerboard(agentid)
  const element = memoryreadobject(board, agentid)
  if (!ispresent(board) || !ispresent(element)) {
    return
  }

  // update last response time
  agentlastresponse[agentid] = Date.now()

  // for ticker text updates
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const timestamp = mainbook?.timestamp ?? 0

  // emit reply line by line
  doasync(vm, agentid, async function () {
    const lines = reply
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // update ticker
      element.tickertext = line
      element.tickertime = timestamp
      // send cli text
      vmcli(vm, agentid, `"${line}`)
      // wait for next line
      await waitfor(1000)
    }
  })
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
