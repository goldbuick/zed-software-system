import { createdevice } from 'zss/device'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import type { AGENT_GENERATE_RESULT } from 'zss/feature/agent/model'
import { createsid } from 'zss/mapping/guid'
import { isstring } from 'zss/mapping/types'

export type AGENT_HISTORY_MESSAGE = {
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string
  name?: string
}

/** Wall-clock ceiling for one generate round (model load + tokens). */
export const AGENT_GENERATE_TIMEOUT_MS = 120_000

export function agentgeneraterequest(
  preset: string,
  systemprompt: string,
  history: AGENT_HISTORY_MESSAGE[],
  onprogress?: (message: string) => void,
  timeoutms = AGENT_GENERATE_TIMEOUT_MS,
): Promise<AGENT_GENERATE_RESULT> {
  return new Promise((resolve, reject) => {
    let settled = false
    const once = createdevice(
      createsid(),
      [],
      (message) => {
        switch (message.target) {
          case 'agent:progress': {
            const data = message.data as { message?: string }
            if (onprogress && isstring(data?.message)) {
              onprogress(data.message)
            }
            break
          }
          case 'agent:generate': {
            if (settled) {
              return
            }
            settled = true
            clearTimeout(timer)
            once.disconnect()
            resolve(message.data as AGENT_GENERATE_RESULT)
            break
          }
          case 'agent:error': {
            if (settled) {
              return
            }
            settled = true
            clearTimeout(timer)
            const data = message.data as { message?: string }
            once.disconnect()
            reject(new Error(data?.message ?? 'agent generate failed'))
            break
          }
        }
      },
      SOFTWARE.session(),
    )
    const timer = setTimeout(() => {
      if (settled) {
        return
      }
      settled = true
      once.disconnect()
      reject(new Error(`agent generate timed out after ${timeoutms}ms`))
    }, timeoutms)
    once.emit(registerreadplayer(), 'agent:generate', [
      preset,
      systemprompt,
      history,
    ])
  })
}

export function agentdisposedrequest(): Promise<void> {
  return new Promise((resolve) => {
    const once = createdevice(
      createsid(),
      [],
      (message) => {
        if (message.target === 'agent:disposed') {
          once.disconnect()
          resolve()
        }
      },
      SOFTWARE.session(),
    )
    once.emit(registerreadplayer(), 'agent:dispose', [])
    setTimeout(() => {
      once.disconnect()
      resolve()
    }, 30_000)
  })
}
