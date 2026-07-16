import { createdevice } from 'zss/device'
import { apierror } from 'zss/device/api'
import {
  agentgeneratestep,
  disposeagentmodel,
} from 'zss/feature/agent/model'
import { isarray, isstring } from 'zss/mapping/types'

let agentjobchain: Promise<unknown> = Promise.resolve()

function enqueueagentjob(player: string, job: () => Promise<void>) {
  agentjobchain = agentjobchain
    .then(() => job())
    .catch((error: unknown) => {
      console.error(error)
      apierror(
        agent,
        player,
        'crash',
        error instanceof Error ? error.message : String(error),
      )
    })
}

const agent = createdevice('agent', [], (message) => {
  if (!agent.session(message)) {
    return
  }

  switch (message.target) {
    case 'generate':
      enqueueagentjob(message.player, async () => {
        if (!isarray(message.data)) {
          agent.reply(message, 'agent:error', {
            message: 'invalid generate payload',
          })
          return
        }
        const [preset, systemprompt, history] = message.data as [
          string,
          string,
          { role: string; content: string }[],
        ]
        try {
          const onworking = (msg: string) => {
            agent.reply(message, 'agent:progress', { message: msg })
          }
          const result = await agentgeneratestep(
            preset,
            isstring(systemprompt) ? systemprompt : '',
            Array.isArray(history) ? history : [],
            onworking,
          )
          agent.reply(message, 'agent:generate', result)
        } catch (error) {
          agent.reply(message, 'agent:error', {
            message: error instanceof Error ? error.message : String(error),
          })
        }
      })
      break
    case 'dispose':
      enqueueagentjob(message.player, async () => {
        await disposeagentmodel()
        agent.reply(message, 'agent:disposed', {})
      })
      break
  }
})
