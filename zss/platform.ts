import boardrunnerspace from './boardrunnerspace??worker'
import { MESSAGE, sessionreset } from './device/api'
import {
  createforward,
  shouldforwardclienttoboardrunner,
  shouldforwardclienttoheavy,
  shouldforwardclienttoserver,
} from './device/forward'
import { SOFTWARE } from './device/session'
import heavyspace from './heavyspace??worker'
import { MAYBE, ispresent } from './mapping/types'
import simspace from './simspace??worker'
import stubspace from './stubspace??worker'

let heavy: MAYBE<Worker>
let boardrunner: MAYBE<Worker>
let platform: MAYBE<Worker>
let platformhalt: MAYBE<() => void>

export function createplatform(isstub = false, climode = false) {
  if (ispresent(platform)) {
    return
  }
  // reset session
  sessionreset(SOFTWARE)

  // create heavy worker
  heavy = new heavyspace({ name: 'heavy' })

  // create boardrunner worker
  boardrunner = new boardrunnerspace({ name: 'boardrunner' })

  // create sim/stub worker
  platform = isstub
    ? new stubspace({ name: 'stub' })
    : new simspace({ name: 'sim' })
  platform.postMessage({ target: 'config', data: climode })
  platform.addEventListener('message', (event) => {
    const msg = event.data as { target?: string; data?: Record<string, unknown> }
    if (msg?.target !== 'debug' || !msg.data) {
      return
    }
    // #region agent log
    fetch('http://127.0.0.1:7474/ingest/f2bfd0d8-5208-447d-9aef-a3f39f2dbf4e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5cf1ca'},body:JSON.stringify({...msg.data,sessionId:'5cf1ca'})}).catch(()=>{});
    // #endregion
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
  })

  // handle messages from heavy
  function heavymessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      boardrunner.postMessage(message)
    }
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
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
    return forward(message)
  }
  platform.addEventListener('message', platformmessages)

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
  }
}

export function haltplatform() {
  platformhalt?.()
  platformhalt = undefined
}
