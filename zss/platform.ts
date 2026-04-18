import boardrunnerspace from './boardrunnerspace??worker'
import { createmessage } from './device'
import { MESSAGE, sessionreset } from './device/api'
import { maybeLogBoardrunnerInbound } from './device/boardrunnerinboundlog'
import {
  createforward,
  shouldforwardclienttoboardrunner,
  shouldforwardclienttoheavy,
  shouldforwardclienttoserver,
} from './device/forward'
import { SOFTWARE } from './device/session'
import heavyspace from './heavyspace??worker'
import { MAYBE, ispresent, isstring } from './mapping/types'
import simspace from './simspace??worker'
import stubspace from './stubspace??worker'

let heavy: MAYBE<Worker>
let boardrunner: MAYBE<Worker>
let platform: MAYBE<Worker>
let platformhalt: MAYBE<() => void>

/** Boardrunner worker → main: drop gadgetclient paint/patch for other players (multiplayer). Empty = no filter. */
let gadgetpaintfilterplayer = ''

/** Must match `boardrunnerspace.ts` worker inbound handler. */
const BOARDRUNNER_WORKER_SET_LOCAL_PLAYER = 'boardrunnerworker:setlocalplayer'

export function platformsetgadgetpaintfilterplayer(player: string) {
  gadgetpaintfilterplayer =
    typeof player === 'string' && player.length > 0 ? player : ''
  if (ispresent(boardrunner)) {
    const pid = isstring(player) && player.length > 0 ? player : ''
    boardrunner.postMessage(
      createmessage(
        '',
        '',
        'platform',
        BOARDRUNNER_WORKER_SET_LOCAL_PLAYER,
        pid,
      ),
    )
  }
}

export function createplatform(isstub = false, climode = false) {
  if (ispresent(platform)) {
    return
  }
  gadgetpaintfilterplayer = ''
  // reset session
  sessionreset(SOFTWARE)
  // create heavy worker
  heavy = new heavyspace()

  // create boardrunner worker
  boardrunner = new boardrunnerspace()

  // create backend
  platform = isstub ? new stubspace() : new simspace()
  platform.postMessage({ target: 'config', data: climode })

  // create bridge
  const { forward, disconnect } = createforward((message) => {
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      maybeLogBoardrunnerInbound(message)
      boardrunner.postMessage(message)
    }
  })

  // handle messages from heavy
  function heavymessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    // handles messages from heavy -> server
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    return forward(message)
  }
  heavy.addEventListener('message', heavymessages)

  // handle messages from boardrunner
  function boardrunnermessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    const dropforeigngadget =
      gadgetpaintfilterplayer.length > 0 &&
      (message.target === 'gadgetclient:paint' ||
        message.target === 'gadgetclient:patch') &&
      message.player !== gadgetpaintfilterplayer
    if (dropforeigngadget) {
      return
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
    // handles routing messages from server -> heavy
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      maybeLogBoardrunnerInbound(message)
      boardrunner.postMessage(message)
    }
    return forward(message)
  }
  platform.addEventListener('message', platformmessages)

  platformhalt = () => {
    gadgetpaintfilterplayer = ''
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
