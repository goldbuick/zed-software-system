import Peer, { DataConnection } from 'peerjs'
import { FEATURE_DIRECT_RUNNER } from 'zss/config'
import { createdevice, createmessage, parsetarget } from 'zss/device'
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
  shouldforwardincomingdirecttoboardrunner,
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
import { hub } from 'zss/hub'
import { doasync } from 'zss/mapping/func'
import { createinfohash } from 'zss/mapping/guid'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
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

// dual-channel transport: every peer pair holds a 'stable' (reliable) and a
// 'fast' (unreliable) DataConnection. v1 routes all traffic on 'stable'; the
// 'fast' channel is opened, kept healthy, and reachable here but no forward
// predicate selects it yet (see plan: hybrid_direct_runner_peer).
type PEER_CHANNEL = 'stable' | 'fast'
type PEER_BRIDGE_ROLE = 'host' | 'join' | 'runner'

type PEER_PAIR = {
  peerid: string
  role: PEER_BRIDGE_ROLE
  stable?: DataConnection
  fast?: DataConnection
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

function pairsendpeer(
  pair: PEER_PAIR,
  message: MESSAGE,
  channel: PEER_CHANNEL = 'stable',
): boolean {
  const primary = pair[channel]
  if (ispresent(primary) && primary.open) {
    sendpeer(primary, message)
    return true
  }
  // fall back to the other channel if the requested one isn't open
  const fallback = channel === 'stable' ? pair.fast : pair.stable
  if (ispresent(fallback) && fallback.open) {
    sendpeer(fallback, message)
    return true
  }
  return false
}

function dataconnectionchannel(dataconnection: DataConnection): PEER_CHANNEL {
  return dataconnection.label === 'fast' ? 'fast' : 'stable'
}

function handledataconnection(
  dataconnection: DataConnection,
  knownrole?: PEER_BRIDGE_ROLE,
) {
  const player = registerreadplayer()
  const remotepeerid = dataconnection.peer
  const channel = dataconnectionchannel(dataconnection)

  let role: PEER_BRIDGE_ROLE
  if (ispresent(knownrole)) {
    role = knownrole
  } else if (ishost()) {
    role = 'host'
  } else if (remotepeerid === subscribetopic) {
    role = 'join'
  } else {
    // we are not host and the remote isn't the host topic - this is another
    // join contacting us as a direct runner peer
    role = 'runner'
  }

  const pair = pairgetorcreate(remotepeerid, role)
  pair[channel] = dataconnection

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
            pairsendpeer(pair, message, 'stable')
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
            pairsendpeer(pair, message, 'stable')
          }
        })
        // signal ready to login
        vmsearch(SOFTWARE, player)
        break
      case 'runner':
        // we are the runner; inbound direct-peer messages are tagged with
        // direct=true on receive (below) and injected into the local hub so
        // the boardrunner worker bridge can pick them up. outbound on this
        // pair is unused in v1: the runner replies to the host via the
        // existing join-to-host bridge using shouldforwardclienttoserver.
        pair.bridge = createforward(() => {
          // intentionally noop: runner side does not push outbound messages
          // onto the direct channel in v1.
        })
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
      `connection ${remotepeerid} ${channel} open (${pair.role})`,
    )
    ensurebridge()
  }

  dataconnection.on('open', () => {
    void runopen()
  })

  dataconnection.on('close', () => {
    if (pair[channel] === dataconnection) {
      pair[channel] = undefined
    }
    if (!ispresent(pair.stable) && !ispresent(pair.fast)) {
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
        if (pair.role === 'runner') {
          // we are the runner; only the narrow direct-runner allow-list
          // is permitted to enter our hub via this channel, and we tag it
          // direct so the local join-to-host bridge refuses to echo it
          // back upstream (defense in depth in forward.ts).
          if (!shouldforwardincomingdirecttoboardrunner(incoming)) {
            return
          }
          incoming.direct = true
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
      `dataconnection ${remotepeerid} ${channel} - ${JSON.stringify(err)}`,
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
  const stable = networkpeer.connect(targetpeerid, {
    label: 'stable',
    reliable: true,
  })
  if (ispresent(stable)) {
    handledataconnection(stable, role)
  }
  const fast = networkpeer.connect(targetpeerid, {
    label: 'fast',
    reliable: false,
  })
  if (ispresent(fast)) {
    handledataconnection(fast, role)
  }
  return pair
}

// --- direct join->runner channel discovery & send -------------------------
//
// every peer receives all boardrunner:tick broadcasts via shouldforwardservertoclient.
// we sniff them on the local hub to maintain (board -> runner player) and to
// opportunistically open direct channels to remote runners.
const boardtorunner = new Map<string, string>()
let directrunnertracker: MAYBE<ReturnType<typeof createdevice>>

function startdirectrunnertracker() {
  if (ispresent(directrunnertracker)) {
    return
  }
  directrunnertracker = createdevice(
    'directrunnertracker',
    ['boardrunner'],
    (message) => {
      const route = parsetarget(message.target)
      if (route.target !== 'boardrunner') {
        return
      }
      if (route.path !== 'tick' || !isarray(message.data)) {
        return
      }
      const [board] = message.data as [unknown]
      if (!isstring(board)) {
        return
      }
      const runner = message.player
      const prev = boardtorunner.get(board)
      if (prev !== runner) {
        boardtorunner.set(board, runner)
      }
      ensurerunnerchannelfor(runner)
    },
  )
}

function stopdirectrunnertracker() {
  directrunnertracker?.disconnect()
  directrunnertracker = undefined
  boardtorunner.clear()
}

function ensurerunnerchannelfor(runnerplayer: string) {
  if (!FEATURE_DIRECT_RUNNER) {
    return
  }
  if (!ispresent(networkpeer)) {
    return
  }
  if (ishost()) {
    // host already has a direct host->runner DataConnection via hostbridge
    return
  }
  const ourplayer = registerreadplayer()
  if (runnerplayer === ourplayer) {
    // we are the runner; nothing to dial
    return
  }
  const peerid = netterminaltopic(runnerplayer)
  if (peerpairs.has(peerid)) {
    return
  }
  apilog(SOFTWARE, ourplayer, `direct runner dial ${runnerplayer} (${peerid})`)
  openpair(peerid, 'runner')
}

/**
 * v1 dual-send for boardrunner:input. Builds one MESSAGE so the host path
 * and the direct-channel path share an id (cross-bridge syncids dedup
 * ensures the runner worker processes the input once). Falls back to the
 * existing host-only path when the feature flag is off or no direct
 * runner channel is open.
 */
export function netterminalsendboardrunnerinput(
  player: string,
  input: number,
  mods: number,
): boolean {
  // build once so direct + host paths share a message id
  const msg = createmessage(
    SOFTWARE.session(),
    player,
    'directinput',
    'boardrunner:input',
    [input, mods],
  )
  // local hub fan-out (continues through joinbridge -> host)
  hub.invoke(msg)
  if (!FEATURE_DIRECT_RUNNER || !ispresent(networkpeer) || ishost()) {
    return false
  }
  // direct broadcast to all open runner channels with the direct flag.
  // wrong-runner workers reject via playersonassignedboard; cross-bridge
  // dedup (createforward syncids) keeps the right runner from processing
  // the input twice when the host copy also arrives.
  let sentdirect = false
  for (const pair of peerpairs.values()) {
    if (pair.role !== 'runner') {
      continue
    }
    const directcopy: MESSAGE = { ...msg, direct: true }
    if (pairsendpeer(pair, directcopy, 'stable')) {
      sentdirect = true
    }
  }
  return sentdirect
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
    // tear down all peer pairs and the runner tracker; PeerJS destroy will
    // also fire close events on each DataConnection, but we drop the local
    // bookkeeping eagerly so reconnects don't dial through stale records.
    for (const pair of peerpairs.values()) {
      pair.bridge?.disconnect()
    }
    peerpairs.clear()
    stopdirectrunnertracker()
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
      // start sniffing boardrunner:tick to maintain (board -> runner) and
      // open direct runner channels when FEATURE_DIRECT_RUNNER is on
      startdirectrunnertracker()
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
