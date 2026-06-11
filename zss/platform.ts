import {
  bootgpucoordinator,
  handleplatformgpurequest,
  setplatformgpuworkers,
} from 'zss/feature/gpu/gpumain'

import boardrunnerspace from './boardrunnerspace??worker'
import { createmessage } from './device'
import { MESSAGE, sessionreset } from './device/api'
import {
  createforward,
  shouldforwardclienttoboardrunner,
  shouldforwardclienttoheavy,
  shouldforwardclienttoserver,
  shouldforwardclienttostt,
  shouldforwardclienttotts,
} from './device/forward'
import { SOFTWARE } from './device/session'
import heavyspace from './heavyspace??worker'
import { MAYBE, ispresent } from './mapping/types'
import simspace from './simspace??worker'
import sttspace from './sttspace??worker'
import stubspace from './stubspace??worker'
import ttsspace from './ttsspace??worker'

let heavy: MAYBE<Worker>
let boardrunner: MAYBE<Worker>
let platform: MAYBE<Worker>
let stt: MAYBE<Worker>
let tts: MAYBE<Worker>
let platformhalt: MAYBE<() => void>
let sttmessagehandler: MAYBE<(event: MessageEvent<any>) => void>
let ttsmessagehandler: MAYBE<(event: MessageEvent<any>) => void>

function postreadytoworker(worker: Worker) {
  const session = SOFTWARE.session()
  if (session) {
    worker.postMessage(
      createmessage(session, '', 'platform', 'ready', undefined),
    )
  }
}

export function ensuresttworker(): Worker | undefined {
  if (ispresent(stt)) {
    return stt
  }
  stt = new sttspace({ name: 'stt' })
  if (sttmessagehandler) {
    stt.addEventListener('message', sttmessagehandler)
  }
  postreadytoworker(stt)
  setplatformgpuworkers({ heavy, stt })
  return stt
}

export function ensurettsworker(): Worker | undefined {
  if (ispresent(tts)) {
    return tts
  }
  tts = new ttsspace({ name: 'tts' })
  if (ttsmessagehandler) {
    tts.addEventListener('message', ttsmessagehandler)
  }
  postreadytoworker(tts)
  return tts
}

export function createplatform(isstub = false, climode = false) {
  if (ispresent(platform)) {
    return
  }
  // reset session
  sessionreset(SOFTWARE)

  void bootgpucoordinator()

  // create heavy worker
  heavy = new heavyspace({ name: 'heavy' })
  setplatformgpuworkers({ heavy, stt })

  // create boardrunner worker
  boardrunner = new boardrunnerspace({ name: 'boardrunner' })

  // create sim/stub worker
  platform = isstub
    ? new stubspace({ name: 'stub' })
    : new simspace({ name: 'sim' })
  platform.postMessage({
    target: 'config',
    data: { climode },
  })

  // create bridge
  const { forward, disconnect } = createforward((message) => {
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      boardrunner.postMessage(message)
    }
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    if (shouldforwardclienttostt(message)) {
      ensuresttworker()?.postMessage(message)
    }
    if (shouldforwardclienttotts(message)) {
      ensurettsworker()?.postMessage(message)
    }
  })

  // handle messages from heavy
  function heavymessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    if (ispresent(heavy) && handleplatformgpurequest(message, heavy)) {
      return
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      boardrunner.postMessage(message)
    }
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    if (shouldforwardclienttostt(message) && ispresent(stt)) {
      stt.postMessage(message)
    }
    if (shouldforwardclienttotts(message) && ispresent(tts)) {
      tts.postMessage(message)
    }
    return forward(message)
  }
  heavy.addEventListener('message', heavymessages)

  // handle messages from boardrunner
  function boardrunnermessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    if (shouldforwardclienttostt(message) && ispresent(stt)) {
      stt.postMessage(message)
    }
    if (shouldforwardclienttotts(message) && ispresent(tts)) {
      tts.postMessage(message)
    }
    return forward(message)
  }
  boardrunner.addEventListener('message', boardrunnermessages)

  // handle messages from  platform
  function platformmessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      boardrunner.postMessage(message)
    }
    if (shouldforwardclienttostt(message) && ispresent(stt)) {
      stt.postMessage(message)
    }
    if (shouldforwardclienttotts(message) && ispresent(tts)) {
      tts.postMessage(message)
    }
    return forward(message)
  }
  platform.addEventListener('message', platformmessages)

  function sttmessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    if (ispresent(stt) && handleplatformgpurequest(message, stt)) {
      return
    }
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      boardrunner.postMessage(message)
    }
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    if (shouldforwardclienttotts(message) && ispresent(tts)) {
      tts.postMessage(message)
    }
    return forward(message)
  }
  sttmessagehandler = sttmessages

  function ttsmessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      boardrunner.postMessage(message)
    }
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    if (shouldforwardclienttostt(message) && ispresent(stt)) {
      stt.postMessage(message)
    }
    return forward(message)
  }
  ttsmessagehandler = ttsmessages

  platformhalt = () => {
    disconnect()
    if (ispresent(heavy)) {
      heavy.removeEventListener('message', heavymessages)
      heavy.terminate()
    }
    heavy = undefined
    if (ispresent(boardrunner)) {
      boardrunner.removeEventListener('message', boardrunnermessages)
      boardrunner.terminate()
    }
    boardrunner = undefined
    if (ispresent(platform)) {
      platform.removeEventListener('message', platformmessages)
      platform.terminate()
    }
    platform = undefined
    if (ispresent(stt)) {
      stt.removeEventListener('message', sttmessages)
      stt.terminate()
    }
    stt = undefined
    sttmessagehandler = undefined
    if (ispresent(tts)) {
      tts.removeEventListener('message', ttsmessages)
      tts.terminate()
    }
    tts = undefined
    ttsmessagehandler = undefined
  }
}

export function haltplatform() {
  platformhalt?.()
  platformhalt = undefined
}
