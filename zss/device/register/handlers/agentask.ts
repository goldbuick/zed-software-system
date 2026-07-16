import type { DEVICE } from 'zss/device'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { createagentfeedback } from 'zss/feature/agent/agentfeedback'
import { runagentask } from 'zss/feature/agent/agentloop'
import {
  type AGENT_LLM_PRESET,
  normalizeagentllmpreset,
} from 'zss/feature/agent/agentpreset'
import { isarray, isstring } from 'zss/mapping/types'

export function handleagentask(device: DEVICE, message: MESSAGE): void {
  const data = isarray(message.data) ? message.data : []
  const prompt = isstring(data[0]) ? data[0].trim() : ''
  const presetraw = isstring(data[1]) ? data[1] : ''
  if (!prompt) {
    return
  }
  const feedback = createagentfeedback(device, message.player)
  feedback.status('agent starting')
  feedback.chat('starting')
  const preset: AGENT_LLM_PRESET | undefined = presetraw
    ? normalizeagentllmpreset(presetraw)
    : undefined
  doasync(device, message.player, async () => {
    try {
      const result = await runagentask(
        message.player,
        prompt,
        {
          onstatus: (msg) => {
            feedback.status(msg)
          },
          ontool: (name) => {
            feedback.tool(name)
          },
          onthinkingstart: () => {
            feedback.startthinking()
          },
          onthinkingstop: () => {
            feedback.stopthinking()
          },
        },
        preset,
      )
      feedback.done(result.finaltext)
    } catch (error) {
      feedback.fail(error instanceof Error ? error.message : String(error))
      throw error
    }
  })
}
