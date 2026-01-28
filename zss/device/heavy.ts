import { createdevice } from 'zss/device'
import { AGENT, createagent } from 'zss/feature/heavy/agent'
import { requestaudiobytes, requestinfo } from 'zss/feature/heavy/tts'
import { write, writeheader } from 'zss/feature/writeui'
import { doasync } from 'zss/mapping/func'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { apierror, vmcli } from './api'

const agents: Record<string, AGENT> = {}

const heavy = createdevice('heavy', [], (message) => {
  if (!heavy.session(message)) {
    return
  }
  switch (message.target) {
    case 'ttsinfo':
      doasync(heavy, message.player, async () => {
        if (isarray(message.data)) {
          const [engine, info] = message.data as [
            engine: 'kitten' | 'piper',
            info: string,
          ]
          const data = await requestinfo(message.player, engine, info)
          if (ispresent(data)) {
            heavy.reply(message, 'heavy:ttsinfo', data)
          }
        }
      })
      break
    case 'ttsrequest':
      doasync(heavy, message.player, async () => {
        if (isarray(message.data)) {
          const [engine, config, voice, phrase] = message.data as [
            engine: 'kitten' | 'piper',
            config: string,
            voice: string,
            phrase: string,
          ]
          const audiobytes = await requestaudiobytes(
            message.player,
            engine,
            config,
            voice,
            phrase,
          )
          if (ispresent(audiobytes)) {
            heavy.reply(message, 'heavy:ttsrequest', audiobytes)
          }
        }
      })
      break
    case 'agentstart': {
      const agent = createagent()
      agents[agent.id()] = agent
      write(heavy, message.player, `agent ${agent.id()} started`)
      break
    }
    case 'agentlist': {
      const instances = Object.values(agents)
      if (instances.length === 0) {
        write(heavy, message.player, 'no agents running')
        return
      } else {
        writeheader(heavy, message.player, 'agents')
        for (let i = 0; i < instances.length; ++i) {
          const agent = instances[i]
          write(
            heavy,
            message.player,
            `!copyit ${agent.id()};agent ${agent.id()}`,
          )
        }
      }
      break
    }
    case 'agentstop':
      if (isstring(message.data)) {
        const agentid = message.data
        const agent = agents[agentid]
        if (ispresent(agent)) {
          agent.stop()
          delete agents[agentid]
          write(heavy, message.player, `agent ${agentid} stopped`)
          vmcli(heavy, message.player, '#agent list')
        } else {
          apierror(heavy, message.player, 'heavy', `agent ${agentid} not found`)
        }
      }
      break
    case 'agentprompt':
      if (isarray(message.data) && message.data.length >= 2) {
        const [agentid, prompt] = message.data as [string, string]
        const agent = agents[agentid]
        if (ispresent(agent)) {
          heavy.emit(message.player, `agent_${agentid}:prompt`, prompt)
        } else {
          apierror(heavy, message.player, 'heavy', `agent ${agentid} not found`)
        }
      }
      break
    default:
      apierror(
        heavy,
        message.player,
        'heavy',
        `unknown message ${message.target}`,
      )
      break
  }
})
