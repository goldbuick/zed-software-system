import { createdevice, parsetarget } from 'zss/device'
import { sessionreset } from 'zss/device/api'
import { startjoinvm } from 'zss/device/joinvm'
import { SOFTWARE } from 'zss/device/session'
import { hub } from 'zss/hub'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

import boardrunnerspace from './boardrunnerspace??worker'
import simspace from './simspace??worker'
import sttspace from './sttspace??worker'
import ttsspace from './ttsspace??worker'

const WORKER_CONFIG_ACK_TIMEOUT_MS = 10_000

let boardrunner: MAYBE<Worker>
let platform: MAYBE<Worker>
let stt: MAYBE<Worker>
let tts: MAYBE<Worker>
let platformhalt: MAYBE<() => void>
let platformsession = ''
let joinvmdevice: MAYBE<ReturnType<typeof startjoinvm>>
let workerbootdevice: MAYBE<ReturnType<typeof createdevice>>
let platformbooting = false

function postworkercfg(
  worker: Worker,
  data: { session: string; climode?: boolean },
) {
  worker.postMessage({
    target: 'config',
    data,
  })
}

function waitworkerconfigack(worker: Worker, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.removeEventListener('message', onmessage)
      reject(new Error(`${label} config ack timeout`))
    }, WORKER_CONFIG_ACK_TIMEOUT_MS)
    function onmessage(event: MessageEvent) {
      if (event.data?.target !== 'configack') {
        return
      }
      clearTimeout(timer)
      worker.removeEventListener('message', onmessage)
      resolve()
    }
    worker.addEventListener('message', onmessage)
  })
}

/** Forward worker debugingest payloads to the page console. */
function attachworkerdebugforward(worker: Worker, label: string) {
  worker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.target !== 'debug') {
      return
    }
    const payload = event.data.data
    console.info(
      `[debugingest ${label}]`,
      payload?.hypothesisId,
      payload?.location,
      payload?.message,
      payload?.data,
    )
  })
}

function ensureworkerbootdevice() {
  if (ispresent(workerbootdevice)) {
    return
  }
  workerbootdevice = createdevice('workerboot', ['all'], (message) => {
    const route = parsetarget(message.target)
    if (route.target === 'tts') {
      const existed = ispresent(tts)
      const worker = ensurettsworker()
      // First message may race hub.join on the new worker; deliver once via port.
      if (!existed && worker) {
        worker.postMessage(message)
      }
    } else if (route.target === 'stt') {
      const existed = ispresent(stt)
      const worker = ensuresttworker()
      if (!existed && worker) {
        worker.postMessage(message)
      }
    }
  })
}

export function ensuresttworker(): Worker | undefined {
  if (ispresent(stt)) {
    return stt
  }
  if (!platformsession) {
    return undefined
  }
  stt = new sttspace({ name: 'stt' })
  postworkercfg(stt, { session: platformsession })
  return stt
}

export function ensurettsworker(): Worker | undefined {
  if (ispresent(tts)) {
    return tts
  }
  if (!platformsession) {
    return undefined
  }
  tts = new ttsspace({ name: 'tts' })
  postworkercfg(tts, { session: platformsession })
  return tts
}

export function createplatform(isstub = false, climode = false) {
  if (ispresent(platform) || ispresent(joinvmdevice) || platformbooting) {
    return
  }
  platformbooting = true
  hub.leave()
  sessionreset(SOFTWARE)

  platformsession = createsid()
  hub.join(platformsession)
  ensureworkerbootdevice()

  boardrunner = new boardrunnerspace({ name: 'boardrunner' })
  attachworkerdebugforward(boardrunner, 'boardrunner')
  postworkercfg(boardrunner, { session: platformsession })

  void (async () => {
    try {
      if (!ispresent(boardrunner)) {
        return
      }
      await waitworkerconfigack(boardrunner, 'boardrunner')
      if (isstub) {
        joinvmdevice = startjoinvm(platformsession)
      } else {
        platform = new simspace({ name: 'sim' })
        attachworkerdebugforward(platform, 'sim')
        postworkercfg(platform, { climode, session: platformsession })
      }
    } catch (err) {
      platformbooting = false
      console.error(
        'createplatform worker boot',
        err instanceof Error ? err.message : String(err),
      )
    }
  })()

  platformhalt = () => {
    platformbooting = false
    hub.leave()
    platformsession = ''
    if (ispresent(joinvmdevice)) {
      joinvmdevice.disconnect()
    }
    joinvmdevice = undefined
    if (ispresent(workerbootdevice)) {
      workerbootdevice.disconnect()
    }
    workerbootdevice = undefined
    if (ispresent(boardrunner)) {
      boardrunner.terminate()
    }
    boardrunner = undefined
    if (ispresent(platform)) {
      platform.terminate()
    }
    platform = undefined
    if (ispresent(stt)) {
      stt.terminate()
    }
    stt = undefined
    if (ispresent(tts)) {
      tts.terminate()
    }
    tts = undefined
  }
}

export function haltplatform() {
  platformhalt?.()
  platformhalt = undefined
}

export function readplatformsessionsid(): string {
  return platformsession
}
