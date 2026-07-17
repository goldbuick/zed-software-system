import type { MESSAGE } from 'zss/device/types'

import boardrunnerspace from './boardrunnerspace??worker'
import { createmessage } from './device'
import { sessionreset } from './device/api'
import {
  createforward,
  shouldforwardclienttoboardrunner,
  shouldforwardclienttoserver,
  shouldforwardclienttostt,
  shouldforwardclienttotts,
  shouldforwardclienttowanix,
} from './device/forward'
import { SOFTWARE } from './device/session'
import {
  postmessagetowanixiframe,
  postreadytowanixiframe,
  setwanixmessagedeliver,
} from './device/wanixclient/wanixbridge'
import { MAYBE, ispresent } from './mapping/types'
import simspace from './simspace??worker'
import sttspace from './sttspace??worker'
import stubspace from './stubspace??worker'
import ttsspace from './ttsspace??worker'

type SpokeSkip = 'boardrunner' | 'platform' | 'stt' | 'tts' | 'wanixserver'

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
    if (shouldforwardclienttowanix(message)) {
      postmessagetowanixiframe(message)
      if (message.target === 'ready') {
        postreadytowanixiframe()
      }
    }
  })

  function fanoutfromspoke(message: MESSAGE, skip?: SpokeSkip) {
    if (
      skip !== 'boardrunner' &&
      shouldforwardclienttoboardrunner(message) &&
      ispresent(boardrunner)
    ) {
      boardrunner.postMessage(message)
    }
    if (
      skip !== 'platform' &&
      shouldforwardclienttoserver(message) &&
      ispresent(platform)
    ) {
      platform.postMessage(message)
    }
    if (skip !== 'stt' && shouldforwardclienttostt(message) && ispresent(stt)) {
      stt.postMessage(message)
    }
    if (skip !== 'tts' && shouldforwardclienttotts(message) && ispresent(tts)) {
      tts.postMessage(message)
    }
    if (skip !== 'wanixserver' && shouldforwardclienttowanix(message)) {
      postmessagetowanixiframe(message)
    }
  }

  setwanixmessagedeliver((message) => {
    fanoutfromspoke(message, 'wanixserver')
    return forward(message)
  })

  // handle messages from boardrunner
  function boardrunnermessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    fanoutfromspoke(message, 'boardrunner')
    return forward(message)
  }
  boardrunner.addEventListener('message', boardrunnermessages)

  // handle messages from  platform
  function platformmessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    fanoutfromspoke(message, 'platform')
    return forward(message)
  }
  platform.addEventListener('message', platformmessages)

  function sttmessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    fanoutfromspoke(message, 'stt')
    return forward(message)
  }
  sttmessagehandler = sttmessages

  function ttsmessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    fanoutfromspoke(message, 'tts')
    return forward(message)
  }
  ttsmessagehandler = ttsmessages

  platformhalt = () => {
    disconnect()
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
    setwanixmessagedeliver(null)
  }
}

export function haltplatform() {
  platformhalt?.()
  platformhalt = undefined
}
