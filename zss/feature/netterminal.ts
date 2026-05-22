import Peer, { DataConnection } from 'peerjs'
import {
  MESSAGE,
  apierror,
  apilog,
  vmsearch,
  vmtopic,
  workstatus,
} from 'zss/device/api'
import {
  createforward,
  shouldforwardclienttoboardrunner,
  shouldforwardclienttoserver,
  shouldforwardonpeerclient,
  shouldforwardonpeerserver,
  shouldforwardservertoclient,
} from 'zss/device/forward'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import {
  decodepeerwire,
  encodepeerwire,
  netmsgtounit8,
} from 'zss/feature/peerzstdwire'
import { storagereadnetid, storagewritenetid } from 'zss/feature/storage'
import { ensurezstdwasm } from 'zss/feature/zstdwasm'
import { doasync } from 'zss/mapping/func'
import { createinfohash } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { recordpeerwirereceived, recordpeerwiresent } from 'zss/perf/peerwire'

async function readpeerid(): Promise<string | undefined> {
  return await storagereadnetid()
}

async function writepeerid(
  updater: (oldValue: string | undefined) => string,
): Promise<void> {
  const oldValue = await storagereadnetid()
  const newValue = updater(oldValue)
  await storagewritenetid(newValue)
}

let subscribetopic = ''
export function readsubscribetopic() {
  return subscribetopic
}

let networkpeer: MAYBE<Peer>

const SIGNAL_HANDSHAKE_TIMEOUT_MS = 20_000
const SIGNAL_RETRY_BASE_MS = 1_000
const SIGNAL_RETRY_MAX_MS = 60_000
const DISCONNECTED_RECONNECT_DELAY_MS = 5_000
const RECONNECT_VERIFY_TIMEOUT_MS = 15_000

let netterminalsessionserial = 0
let signalhandshaketimer: ReturnType<typeof setTimeout> | undefined
let signalreconnecttimer: ReturnType<typeof setTimeout> | undefined
let signalreconnectverifytimer: ReturnType<typeof setTimeout> | undefined
let signalretrytimer: ReturnType<typeof setTimeout> | undefined
let netterminalunloadregistered = false

function netterminalclearhandshaketimer() {
  if (signalhandshaketimer !== undefined) {
    clearTimeout(signalhandshaketimer)
    signalhandshaketimer = undefined
  }
}

function netterminalclearreconnecttimers() {
  if (signalreconnecttimer !== undefined) {
    clearTimeout(signalreconnecttimer)
    signalreconnecttimer = undefined
  }
  if (signalreconnectverifytimer !== undefined) {
    clearTimeout(signalreconnectverifytimer)
    signalreconnectverifytimer = undefined
  }
}

function netterminalclearsignalretrytimer() {
  if (signalretrytimer !== undefined) {
    clearTimeout(signalretrytimer)
    signalretrytimer = undefined
  }
}

function netterminalclearallschedule() {
  netterminalclearhandshaketimer()
  netterminalclearreconnecttimers()
  netterminalclearsignalretrytimer()
}

function registernetterminalunload() {
  if (netterminalunloadregistered) {
    return
  }
  netterminalunloadregistered = true
  window.addEventListener('unload', () => {
    networkpeer?.disconnect()
    networkpeer = undefined
  })
}

function issignalrecoverableerrortype(type: string) {
  return (
    type === 'network' ||
    type === 'server-error' ||
    type === 'socket-error' ||
    type === 'socket-closed'
  )
}

function ishost() {
  return networkpeer?.id === subscribetopic
}

function netterminaltopic(player: string) {
  return createinfohash(player)
}

function sendpeer(dataconnection: DataConnection, message: MESSAGE): void {
  const wire = encodepeerwire(message)
  recordpeerwiresent(wire.byteLength)
  void dataconnection.send(wire)
}

type PEER_BRIDGE_ROLE = 'host' | 'join'

type PEER_PAIR = {
  peerid: string
  role: PEER_BRIDGE_ROLE
  connection?: DataConnection
  bridge?: ReturnType<typeof createforward>
  bridgeready: boolean
}

const peerpairs = new Map<string, PEER_PAIR>()

function pairgetorcreate(peerid: string, role: PEER_BRIDGE_ROLE): PEER_PAIR {
  let pair = peerpairs.get(peerid)
  if (!ispresent(pair)) {
    pair = { peerid, role, bridgeready: false }
    peerpairs.set(peerid, pair)
  }
  return pair
}

function pairsendpeer(pair: PEER_PAIR, message: MESSAGE): boolean {
  const connection = pair.connection
  if (ispresent(connection) && connection.open) {
    sendpeer(connection, message)
    return true
  }
  return false
}

function handledataconnection(
  dataconnection: DataConnection,
  knownrole?: PEER_BRIDGE_ROLE,
) {
  const player = registerreadplayer()
  const remotepeerid = dataconnection.peer

  let role: PEER_BRIDGE_ROLE
  if (ispresent(knownrole)) {
    role = knownrole
  } else if (ishost()) {
    role = 'host'
  } else {
    role = 'join'
  }

  const pair = pairgetorcreate(remotepeerid, role)
  pair.connection = dataconnection

  function ensurebridge() {
    if (pair.bridgeready) {
      return
    }
    pair.bridgeready = true
    switch (pair.role) {
      case 'host':
        pair.bridge = createforward((message) => {
          if (!ispresent(networkpeer) || !shouldforwardonpeerserver(message)) {
            return
          }
          if (shouldforwardservertoclient(message)) {
            pairsendpeer(pair, message)
          }
        })
        break
      case 'join':
        pair.bridge = createforward((message) => {
          if (!ispresent(networkpeer) || !shouldforwardonpeerclient(message)) {
            return
          }
          if (
            shouldforwardclienttoserver(message) ||
            shouldforwardclienttoboardrunner(message)
          ) {
            pairsendpeer(pair, message)
          }
        })
        // signal ready to login
        vmsearch(SOFTWARE, player)
        break
    }
  }

  async function runopen() {
    if (!dataconnection.open) {
      return
    }
    await ensurezstdwasm()
    apilog(
      SOFTWARE,
      player,
      `connection ${remotepeerid} open (${pair.role})`,
    )
    ensurebridge()
  }

  dataconnection.on('open', () => {
    void runopen()
  })

  dataconnection.on('close', () => {
    if (pair.connection === dataconnection) {
      pair.connection = undefined
    }
    if (!ispresent(pair.connection)) {
      pair.bridge?.disconnect()
      peerpairs.delete(remotepeerid)
      if (ispresent(networkpeer)) {
        apilog(SOFTWARE, player, `disconnection from ${remotepeerid}`)
      }
    }
  })

  dataconnection.on('data', (netmsg: unknown) => {
    void (async () => {
      if (!ispresent(networkpeer)) {
        return
      }
      const bytes = await netmsgtounit8(netmsg)
      if (!ispresent(bytes)) {
        apilog(
          SOFTWARE,
          player,
          'netterminal wire: drop non-binary peer payload',
        )
        return
      }
      recordpeerwirereceived(bytes.byteLength)
      try {
        const message = decodepeerwire(bytes)
        const incoming: MESSAGE = {
          ...message,
          session: SOFTWARE.session(),
        }
        pair.bridge?.forward(incoming)
      } catch (err) {
        apilog(
          SOFTWARE,
          player,
          'netterminal wire decode',
          err instanceof Error ? err.message : String(err),
        )
      }
    })()
  })

  dataconnection.on('error', (err) => {
    apierror(
      SOFTWARE,
      player,
      `netterminal`,
      `dataconnection ${remotepeerid} - ${JSON.stringify(err)}`,
    )
  })

  void runopen()
}

function openpair(
  targetpeerid: string,
  role: PEER_BRIDGE_ROLE,
): MAYBE<PEER_PAIR> {
  if (!ispresent(networkpeer)) {
    return undefined
  }
  // pre-create pair so role is settled before any 'open' event fires
  const pair = pairgetorcreate(targetpeerid, role)
  const connection = networkpeer.connect(targetpeerid, {
    label: 'stable',
    reliable: true,
  })
  if (ispresent(connection)) {
    handledataconnection(connection, role)
  }
  return pair
}

function netterminalcreate(topicpeerid: string, selfpeerid?: string) {
  const sessionserial = ++netterminalsessionserial
  const player = registerreadplayer()
  const peerid = selfpeerid ?? topicpeerid
  let signalretryattempt = 0
  let restartscheduled = false
  let joinoutsignalconnectdone = false

  subscribetopic = topicpeerid
  vmtopic(SOFTWARE, player, subscribetopic)

  function peerserveroptions() {
    return {
      debug: 2,
      host: 'terminal.zed.cafe',
      secure: true,
      port: 443,
    }
  }

  function sessionstillactive() {
    return sessionserial === netterminalsessionserial
  }

  function destroyactivenetworkpeer() {
    if (!ispresent(networkpeer)) {
      return
    }
    networkpeer.destroy()
    networkpeer = undefined
    // tear down all peer pairs; PeerJS destroy will also fire close events
    // on each DataConnection, but we drop the local bookkeeping eagerly so
    // reconnects don't dial through stale records.
    for (const pair of peerpairs.values()) {
      pair.bridge?.disconnect()
    }
    peerpairs.clear()
  }

  function requestfullsignalingrestart(reason: string) {
    if (!sessionstillactive()) {
      return
    }
    if (restartscheduled) {
      return
    }
    restartscheduled = true
    netterminalclearhandshaketimer()
    netterminalclearreconnecttimers()
    netterminalclearsignalretrytimer()
    destroyactivenetworkpeer()
    const delay = Math.min(
      SIGNAL_RETRY_MAX_MS,
      SIGNAL_RETRY_BASE_MS * 2 ** signalretryattempt,
    )
    signalretryattempt += 1
    apilog(
      SOFTWARE,
      player,
      `netterminal signaling restart in ${delay}ms (${reason})`,
    )
    signalretrytimer = setTimeout(() => {
      signalretrytimer = undefined
      restartscheduled = false
      if (!sessionstillactive()) {
        return
      }
      startsignalingpeer()
    }, delay)
  }

  function startsignalingpeer() {
    if (!sessionstillactive()) {
      return
    }
    restartscheduled = false
    joinoutsignalconnectdone = false
    netterminalclearhandshaketimer()
    netterminalclearreconnecttimers()
    if (ispresent(networkpeer)) {
      networkpeer.destroy()
      networkpeer = undefined
    }
    networkpeer = new Peer(peerid, peerserveroptions())
    registernetterminalunload()

    workstatus(SOFTWARE, player, 'peer dial')
    apilog(SOFTWARE, player, `netterminal for ${peerid}`)

    signalhandshaketimer = setTimeout(() => {
      signalhandshaketimer = undefined
      if (!sessionstillactive() || !ispresent(networkpeer)) {
        return
      }
      if (networkpeer.open) {
        return
      }
      apierror(SOFTWARE, player, `netterminal`, `signaling handshake timed out`)
      requestfullsignalingrestart('handshake timeout')
    }, SIGNAL_HANDSHAKE_TIMEOUT_MS)

    networkpeer.on('open', () => {
      if (!sessionstillactive()) {
        return
      }
      netterminalclearhandshaketimer()
      netterminalclearreconnecttimers()
      signalretryattempt = 0
      apilog(SOFTWARE, player, `connected to netterminal`)
      apilog(SOFTWARE, player, 'peer connected')
      if (topicpeerid !== peerid) {
        if (!joinoutsignalconnectdone) {
          joinoutsignalconnectdone = true
          apilog(SOFTWARE, player, `joining topic ${subscribetopic}`)
          openpair(topicpeerid, 'join')
        }
      } else {
        apilog(SOFTWARE, player, `hosting topic ${subscribetopic}`)
      }
    })

    networkpeer.on('connection', handledataconnection)

    networkpeer.on('disconnected', () => {
      if (!sessionstillactive()) {
        return
      }
      netterminalclearreconnecttimers()
      netterminalclearhandshaketimer()
      apierror(
        SOFTWARE,
        player,
        `netterminal`,
        `lost connection to netterminal`,
      )
      signalreconnecttimer = setTimeout(() => {
        signalreconnecttimer = undefined
        if (!sessionstillactive() || !ispresent(networkpeer)) {
          return
        }
        apierror(
          SOFTWARE,
          player,
          `netterminal`,
          `retrying the connection to netterminal`,
        )
        networkpeer.reconnect()
        signalreconnectverifytimer = setTimeout(() => {
          signalreconnectverifytimer = undefined
          if (!sessionstillactive() || !ispresent(networkpeer)) {
            return
          }
          if (networkpeer.open) {
            return
          }
          apierror(
            SOFTWARE,
            player,
            `netterminal`,
            `signaling reconnect failed; recreating peer`,
          )
          requestfullsignalingrestart('reconnect verify failed')
        }, RECONNECT_VERIFY_TIMEOUT_MS)
      }, DISCONNECTED_RECONNECT_DELAY_MS)
    })

    networkpeer.on('error', (err) => {
      if (!sessionstillactive()) {
        return
      }
      switch (err.type) {
        case 'disconnected':
        case 'peer-unavailable':
          return
        case 'invalid-id':
        case 'unavailable-id':
          netterminalclearallschedule()
          destroyactivenetworkpeer()
          doasync(SOFTWARE, player, async () => {
            await writepeerid(() => '')
          })
          return
        default:
          break
      }
      if (issignalrecoverableerrortype(err.type)) {
        apierror(
          SOFTWARE,
          player,
          `netterminal`,
          `${networkpeer?.id} - ${JSON.stringify(err)}`,
        )
        requestfullsignalingrestart(err.type)
        return
      }
      apierror(
        SOFTWARE,
        player,
        `netterminal`,
        `${networkpeer?.id} - ${JSON.stringify(err)}`,
      )
    })
  }

  startsignalingpeer()
}

export async function netterminalhost() {
  const player = registerreadplayer()
  if (ispresent(networkpeer)) {
    apilog(SOFTWARE, player, `netterminal already active`)
    return
  }

  // read cached topic
  let stickypeerid = await readpeerid()
  stickypeerid = (stickypeerid ?? '') || player

  // write peerid
  await writepeerid(() => stickypeerid ?? '')

  // make topicpeerid
  const topicpeerid = netterminaltopic(stickypeerid)

  // startup peerjs
  netterminalcreate(topicpeerid)
}

export function netterminaljoin(topicpeerid: string) {
  const player = registerreadplayer()
  if (ispresent(networkpeer)) {
    apilog(SOFTWARE, player, `netterminal already active`)
    return
  }

  // startup peerjs
  const selfpeerid = netterminaltopic(player)
  netterminalcreate(topicpeerid, selfpeerid)
}
