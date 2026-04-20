import Peer, { DataConnection } from 'peerjs'
import {
  MESSAGE,
  apierror,
  apilog,
  vmpeergone,
  vmsearch,
  vmtopic,
} from 'zss/device/api'
import {
  createforward,
  shouldforwardclienttoserver,
  shouldforwardservertoclient,
  shouldnotforwardonpeerclient,
  shouldnotforwardonpeerserver,
} from 'zss/device/forward'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { netformatdecode, netformatencode } from 'zss/feature/netformat'
import { storagereadnetid, storagewritenetid } from 'zss/feature/storage'
import { doasync } from 'zss/mapping/func'
import { createinfohash, createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'

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

const NETFORMAT_CAP_TARGET = 'netterminal:cap'
const NETFORMAT_META_SUPPORTS_V1 = 'supportsNetformatV1'

let netterminalsessionserial = 0
let signalhandshaketimer: ReturnType<typeof setTimeout> | undefined
let signalreconnecttimer: ReturnType<typeof setTimeout> | undefined
let signalreconnectverifytimer: ReturnType<typeof setTimeout> | undefined
let signalretrytimer: ReturnType<typeof setTimeout> | undefined
let netterminalunloadregistered = false

/** Host queues player-targeted outbound messages until joiner id is known. */
const PREHANDSHAKE_HOST_QUEUE_MAX = 128

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

function netterminalparsedata(netmsg: unknown): MESSAGE {
  if (netmsg instanceof Uint8Array) {
    return netformatdecode(netmsg)
  }
  if (typeof ArrayBuffer !== 'undefined' && netmsg instanceof ArrayBuffer) {
    return netformatdecode(netmsg)
  }
  if (
    typeof Buffer !== 'undefined' &&
    typeof Buffer.isBuffer === 'function' &&
    Buffer.isBuffer(netmsg)
  ) {
    return netformatdecode(new Uint8Array(netmsg))
  }
  throw new Error('netterminalparsedata: expected CBOR wire (binary frame)')
}

const netterminalencodecache = new WeakMap<MESSAGE, Uint8Array>()

function handledataconnection(dataconnection: DataConnection) {
  const player = registerreadplayer()
  let topicbridge: MAYBE<ReturnType<typeof createforward>>
  let bridgeinited = false
  // learned from the first inbound message on this dataconnection. the joiner
  // stamps message.player on every emit, so the host learns its peer's player
  // id lazily without any extra handshake.
  let remotepeerplayer = ''
  /** Joiner: host player id from `netterminal:cap` (reliable vmpeergone target). */
  let joinhostplayer = ''
  const pendingpeerhost: MESSAGE[] = []
  let pendingpeerhostdroplogged = false

  function sendpeermessage(message: MESSAGE) {
    let bytes = netterminalencodecache.get(message)
    if (!bytes) {
      bytes = netformatencode(message)
      netterminalencodecache.set(message, bytes)
    }
    void dataconnection.send(bytes)
  }

  function flushpendingpeerhost() {
    if (!ishost()) {
      return
    }
    while (pendingpeerhost.length > 0) {
      const m = pendingpeerhost.shift()!
      if (
        m.player.length > 0 &&
        remotepeerplayer.length > 0 &&
        m.player !== remotepeerplayer
      ) {
        continue
      }
      if (
        shouldforwardservertoclient(m) &&
        shouldnotforwardonpeerserver(m) === false
      ) {
        sendpeermessage(m)
      }
    }
  }

  function hostbridge() {
    // open bridge between peers
    topicbridge = createforward((message) => {
      if (!ispresent(networkpeer)) {
        return
      }
      if (
        shouldforwardservertoclient(message) &&
        shouldnotforwardonpeerserver(message) === false
      ) {
        // envelope-level fan-out filter: if this message targets a specific
        // player (non-empty message.player) and we know this peer's player id,
        // only forward when they match. broadcasts (message.player === '')
        // always pass through.
        if (
          message.player.length > 0 &&
          remotepeerplayer.length > 0 &&
          message.player !== remotepeerplayer
        ) {
          return
        }
        if (message.player.length > 0 && remotepeerplayer.length === 0) {
          if (pendingpeerhost.length >= PREHANDSHAKE_HOST_QUEUE_MAX) {
            pendingpeerhost.shift()
            if (!pendingpeerhostdroplogged) {
              pendingpeerhostdroplogged = true
              apilog(
                SOFTWARE,
                player,
                `peer ${dataconnection.peer}: dropped oldest queued targeted message (pre-handshake cap ${PREHANDSHAKE_HOST_QUEUE_MAX})`,
              )
            }
          }
          pendingpeerhost.push(message)
          return
        }
        sendpeermessage(message)
      }
    })
  }

  function joinbridge() {
    // open bridge between peers
    topicbridge = createforward(
      (message) => {
        if (!ispresent(networkpeer)) {
          return
        }
        if (
          shouldforwardclienttoserver(message) &&
          shouldnotforwardonpeerclient(message) === false
        ) {
          sendpeermessage(message)
        }
      },
      { allowticktock: true },
    )
    // signal ready to login
    vmsearch(SOFTWARE, player)
  }

  function handleopen() {
    if (!dataconnection.open) {
      return
    }
    if (bridgeinited) {
      return
    }
    bridgeinited = true
    apilog(SOFTWARE, player, `connection ${dataconnection.peer} open`)
    if (ishost()) {
      hostbridge()
      sendpeermessage({
        session: SOFTWARE.session(),
        player,
        id: createsid(),
        sender: 'netterminal',
        target: NETFORMAT_CAP_TARGET,
        data: { v: 1, host: player },
      })
      apilog(
        SOFTWARE,
        player,
        `peer ${dataconnection.peer}: sent netformat v1 cap (CBOR)`,
      )
    } else {
      joinbridge()
    }
  }

  dataconnection.on('open', handleopen)

  dataconnection.on('close', () => {
    topicbridge?.disconnect()
    if (ispresent(networkpeer)) {
      apilog(SOFTWARE, player, `disconnection from ${dataconnection.peer}`)
    }
    // Phase 3 failover: signal the VM that this peer has departed so it
    // can clear board-runner election entries that reference the gone
    // player. The next `second`-cycle election picks a fresh runner.
    const departed = ishost()
      ? remotepeerplayer
      : joinhostplayer.length > 0
        ? joinhostplayer
        : remotepeerplayer
    if (departed.length > 0) {
      vmpeergone(SOFTWARE, departed)
    }
  })

  dataconnection.on('data', (netmsg: any) => {
    if (!ispresent(networkpeer)) {
      return
    }
    let message: MESSAGE
    try {
      message = netterminalparsedata(netmsg)
    } catch (err) {
      apierror(
        SOFTWARE,
        player,
        `netterminal`,
        `parse peer data: ${String(err)}`,
      )
      return
    }
    if (message.target === NETFORMAT_CAP_TARGET) {
      if (!ishost()) {
        const cap = message.data as { v?: number; host?: string } | undefined
        if (isstring(cap?.host) && cap.host.length > 0) {
          joinhostplayer = cap.host
        }
        apilog(
          SOFTWARE,
          player,
          `peer ${dataconnection.peer}: received netformat v1 cap (CBOR)`,
        )
      }
      return
    }
    // learn the remote peer's player id from their own emits. every
    // client->server message carries message.player = joiner's player, so the
    // first non-empty value is authoritative for the life of this connection.
    if (
      remotepeerplayer.length === 0 &&
      isstring(message.player) &&
      message.player.length > 0
    ) {
      remotepeerplayer = message.player
      flushpendingpeerhost()
    }
    topicbridge?.forward({
      ...message,
      session: SOFTWARE.session(),
    })
  })

  dataconnection.on('error', (err) => {
    apierror(
      SOFTWARE,
      player,
      `netterminal`,
      `dataconnection ${dataconnection.peer} - ${JSON.stringify(err)}`,
    )
  })

  handleopen()
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
      if (topicpeerid !== peerid) {
        if (!joinoutsignalconnectdone) {
          joinoutsignalconnectdone = true
          apilog(SOFTWARE, player, `joining topic ${subscribetopic}`)
          const maybedataconnection = networkpeer?.connect(topicpeerid, {
            reliable: true,
            metadata: { [NETFORMAT_META_SUPPORTS_V1]: true },
          })
          if (ispresent(maybedataconnection)) {
            handledataconnection(maybedataconnection)
          }
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

export function netterminalhalt() {
  if (!ispresent(networkpeer) && subscribetopic === '') {
    return
  }
  netterminalsessionserial += 1
  netterminalclearallschedule()
  subscribetopic = ''
  vmtopic(SOFTWARE, registerreadplayer(), subscribetopic)
  networkpeer?.destroy()
  networkpeer = undefined
}
