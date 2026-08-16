import Peer, { DataConnection, MediaConnection } from 'peerjs'
import { createdevice, createmessage, parsetarget } from 'zss/device'
import {
  apierror,
  apilog,
  netterminalpeerroster,
  vmsearch,
  vmtopic,
  workstatus,
} from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import {
  createforward,
  shouldforwardclienttoserver,
  shouldforwardonpeerclient,
  shouldforwardonpeerserver,
  shouldforwardservertoclient,
} from 'zss/device/forward'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import type { MESSAGE } from 'zss/device/types'
import { peerserveroptions } from 'zss/feature/peerserver'
import {
  decodepeerwire,
  encodepeerwire,
  netmsgtounit8,
} from 'zss/feature/peerzstdwire'
import { storagereadnetid, storagewritenetid } from 'zss/feature/storage'
import { znsautopublishpeer } from 'zss/feature/url'
import { ensurezstdwasm } from 'zss/feature/zstdwasm'
import { createinfohash } from 'zss/mapping/guid'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'
import { recordpeerwirereceived, recordpeerwiresent } from 'zss/perf/peerwire'
import { readplatformsessionsid } from 'zss/platform'

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

export function readnetworkpeerid(): string | undefined {
  if (ispresent(networkpeer) && networkpeer.open && networkpeer.id) {
    return networkpeer.id
  }
  return undefined
}

export type NETTERMINAL_PEER_ROSTER_ENTRY = {
  player: string
  peerid: string
}

/** Snapshot of player -> peerid clique roster (host + joins). */
export function readpeerroster(): NETTERMINAL_PEER_ROSTER_ENTRY[] {
  return rosterentries()
}

type MEDIACALL_HANDLER = (call: MediaConnection) => void
type ROSTER_CHANGE_HANDLER = () => void
type PEER_OPEN_HANDLER = () => void

let mediacallhandler: MAYBE<MEDIACALL_HANDLER>
let rosterchangehandler: MAYBE<ROSTER_CHANGE_HANDLER>
const peeropenhandlers: PEER_OPEN_HANDLER[] = []

function runpeeropenhandlers() {
  for (let i = 0; i < peeropenhandlers.length; ++i) {
    peeropenhandlers[i]()
  }
}

/** MediaConnection answer path (media queue board room). Not game DataConnection. */
export function netterminalregistermediacallhandler(
  handler: MEDIACALL_HANDLER,
) {
  mediacallhandler = handler
}

export function netterminalregisterrosterchangehandler(
  handler: ROSTER_CHANGE_HANDLER,
) {
  rosterchangehandler = handler
}

/** Run when the clique Peer opens (host or join) so media can answer room calls. */
export function netterminalregisterpeeropenhandler(handler: PEER_OPEN_HANDLER) {
  peeropenhandlers.push(handler)
  if (netterminalpeerisopen()) {
    handler()
  }
}

/** Outbound MediaConnection from the clique Peer (e.g. direct helper connect). */
export function netterminalmediacall(
  peerid: string,
  stream: MediaStream,
  metadata?: object,
): MAYBE<MediaConnection> {
  if (!ispresent(networkpeer) || !networkpeer.open || !peerid) {
    return undefined
  }
  return networkpeer.call(peerid, stream, metadata ? { metadata } : undefined)
}

export function netterminalpeerisopen(): boolean {
  return ispresent(networkpeer) && networkpeer.open
}

/** Start hosting if needed and wait until the clique Peer is open (for #media, etc.). */
export async function netterminalensurehostready(
  timeoutms = SIGNAL_HANDSHAKE_TIMEOUT_MS,
): Promise<boolean> {
  if (netterminalpeerisopen()) {
    return true
  }
  const player = registerreadplayer()
  if (!ispresent(networkpeer)) {
    apilog(SOFTWARE, player, 'starting netterminal for cafe session')
    await netterminalhost()
  }
  if (netterminalpeerisopen()) {
    return true
  }
  const peer = networkpeer
  if (!ispresent(peer)) {
    apierror(SOFTWARE, player, 'netterminal', 'peer failed to start')
    return false
  }
  return await new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      peer.off('open', onopen)
      peer.off('error', onerror)
      resolve(ok)
    }
    const onopen = () => finish(true)
    const onerror = () => finish(false)
    const timer = setTimeout(() => {
      apierror(SOFTWARE, player, 'netterminal', 'peer handshake timed out')
      finish(false)
    }, timeoutms)
    peer.on('open', onopen)
    peer.on('error', onerror)
    if (peer.open) {
      onopen()
    }
  })
}

/** Outbound DataConnection on the clique Peer (media queue helper control plane). */
export function netterminaldataconnect(peerid: string): MAYBE<DataConnection> {
  const trimmed = peerid.trim()
  if (!netterminalpeerisopen() || !trimmed) {
    return undefined
  }
  return networkpeer?.connect(trimmed, { reliable: true })
}

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

const NETTERMINAL_MAX_JOINS = 10

type PEER_ROSTER_ENTRY = NETTERMINAL_PEER_ROSTER_ENTRY

function shoulddialpeer(selfpeerid: string, otherpeerid: string): boolean {
  if (!selfpeerid || !otherpeerid || selfpeerid === otherpeerid) {
    return false
  }
  return selfpeerid < otherpeerid
}

function shouldforwardchiponjoinedge(message: MESSAGE): boolean {
  return parsetarget(message.target).target === 'chip'
}

/** peerid -> player (roster) */
const playerbypeer: Record<string, string> = {}
/** player -> peerid */
const peerbyplayer: Record<string, string> = {}
/** open join-join (and host-tracked join) connections by remote peer id */
const peerconnections = new Map<string, DataConnection>()
/** peers we already dialed this session (avoid repeat connect storms) */
const dialedinpeers = new Set<string>()

function clearpeercliquestate() {
  for (const key of Object.keys(playerbypeer)) {
    delete playerbypeer[key]
  }
  for (const key of Object.keys(peerbyplayer)) {
    delete peerbyplayer[key]
  }
  peerconnections.clear()
  dialedinpeers.clear()
}

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

function peersessionforsessionrewrite(): string {
  return SOFTWARE.session() || readplatformsessionsid()
}

function countopenjoins(): number {
  let n = 0
  for (const [peerid, conn] of peerconnections) {
    if (peerid !== subscribetopic && conn.open) {
      ++n
    }
  }
  return n
}

function rosterentries(): PEER_ROSTER_ENTRY[] {
  const entries: PEER_ROSTER_ENTRY[] = []
  const seen = new Set<string>()
  for (const player of Object.keys(peerbyplayer)) {
    const peerid = peerbyplayer[player]
    if (!peerid || seen.has(peerid)) {
      continue
    }
    seen.add(peerid)
    entries.push({ player, peerid })
  }
  return entries
}

function applyrosterentries(entries: PEER_ROSTER_ENTRY[]) {
  for (const key of Object.keys(playerbypeer)) {
    delete playerbypeer[key]
  }
  for (const key of Object.keys(peerbyplayer)) {
    delete peerbyplayer[key]
  }
  for (let i = 0; i < entries.length; ++i) {
    const entry = entries[i]
    if (!entry?.player || !entry.peerid) {
      continue
    }
    playerbypeer[entry.peerid] = entry.player
    peerbyplayer[entry.player] = entry.peerid
  }
}

function broadcastpeerroster() {
  if (!ishost()) {
    return
  }
  const player = registerreadplayer()
  netterminalpeerroster(SOFTWARE, player, rosterentries())
}

function ensurehostselfonroster() {
  if (!ishost()) {
    return
  }
  const player = registerreadplayer()
  const peerid = networkpeer?.id
  if (!player || !peerid) {
    return
  }
  peerbyplayer[player] = peerid
  playerbypeer[peerid] = player
}

function ensurejoinclique() {
  if (ishost() || !ispresent(networkpeer) || !networkpeer.open) {
    return
  }
  const selfpeerid = networkpeer.id
  if (!selfpeerid) {
    return
  }
  const hostpeerid = subscribetopic
  const player = registerreadplayer()
  for (const peerid of Object.keys(playerbypeer)) {
    if (peerid === selfpeerid || peerid === hostpeerid) {
      continue
    }
    if (peerconnections.has(peerid) && peerconnections.get(peerid)?.open) {
      continue
    }
    if (!shoulddialpeer(selfpeerid, peerid)) {
      continue
    }
    if (dialedinpeers.has(peerid)) {
      continue
    }
    dialedinpeers.add(peerid)
    apilog(SOFTWARE, player, `join clique dial ${peerid}`)
    const conn = networkpeer.connect(peerid, { reliable: true })
    if (ispresent(conn)) {
      handledataconnection(conn)
    }
  }
}

function trackpeerconnection(dataconnection: DataConnection) {
  peerconnections.set(dataconnection.peer, dataconnection)
}

function untrackpeerconnection(peerid: string) {
  peerconnections.delete(peerid)
  dialedinpeers.delete(peerid)
}

function handledataconnection(dataconnection: DataConnection) {
  const player = registerreadplayer()
  const remotepeer = dataconnection.peer
  let topicbridge: MAYBE<ReturnType<typeof createforward>>
  let bridgeopened = false
  const pendingincoming: MESSAGE[] = []

  function deliverincoming(message: MESSAGE) {
    if (!ispresent(topicbridge)) {
      pendingincoming.push(message)
      return
    }
    topicbridge.forward(message)
  }

  function flushpendingincoming() {
    while (pendingincoming.length > 0 && ispresent(topicbridge)) {
      const next = pendingincoming.shift()
      if (ispresent(next)) {
        topicbridge.forward(next)
      }
    }
  }

  function isstarhostlink(): boolean {
    if (ishost()) {
      return true
    }
    return remotepeer === subscribetopic
  }

  function isjoinejoinlink(): boolean {
    return !ishost() && remotepeer !== subscribetopic
  }

  function hostbridge() {
    topicbridge = createforward((message) => {
      if (!ispresent(networkpeer) || !shouldforwardonpeerserver(message)) {
        return
      }
      if (shouldforwardservertoclient(message)) {
        sendpeer(dataconnection, message)
      }
    })
  }

  function joinbridgestar() {
    topicbridge = createforward((message) => {
      if (!ispresent(networkpeer) || !shouldforwardonpeerclient(message)) {
        return
      }
      if (
        shouldforwardchiponjoinedge(message) ||
        shouldforwardclienttoserver(message)
      ) {
        sendpeer(dataconnection, message)
      }
    })
    vmsearch(SOFTWARE, player)
    // announce this join so host can build roster
    const selfpeerid = networkpeer?.id
    if (selfpeerid) {
      sendpeer(
        dataconnection,
        createmessage(
          peersessionforsessionrewrite(),
          player,
          'netterminal',
          'netterminal:peerhello',
          { player, peerid: selfpeerid },
        ),
      )
    }
  }

  function joinbridgeedge() {
    topicbridge = createforward((message) => {
      if (!ispresent(networkpeer) || !shouldforwardonpeerclient(message)) {
        return
      }
      if (!shouldforwardchiponjoinedge(message)) {
        return
      }
      sendpeer(dataconnection, message)
    })
  }

  async function runopen() {
    if (!dataconnection.open || bridgeopened) {
      return
    }
    bridgeopened = true
    await ensurezstdwasm()
    if (!dataconnection.open || !ispresent(networkpeer)) {
      bridgeopened = false
      return
    }

    if (ishost()) {
      // refuse over cap before tracking
      if (countopenjoins() >= NETTERMINAL_MAX_JOINS) {
        apierror(
          SOFTWARE,
          player,
          'netterminal',
          `join cap ${NETTERMINAL_MAX_JOINS} reached; refusing ${remotepeer}`,
        )
        dataconnection.close()
        bridgeopened = false
        return
      }
    }

    // trust: join-join only if peer is on roster (or roster empty during race -- allow, host will confirm)
    if (isjoinejoinlink()) {
      const known = playerbypeer[remotepeer]
      if (!known && Object.keys(playerbypeer).length > 0) {
        // roster present but peer unknown -- drop
        apilog(SOFTWARE, player, `join clique drop unknown peer ${remotepeer}`)
        dataconnection.close()
        bridgeopened = false
        return
      }
    }

    trackpeerconnection(dataconnection)
    apilog(SOFTWARE, player, `connection ${remotepeer} open`)

    if (ishost()) {
      ensurehostselfonroster()
      hostbridge()
    } else if (isstarhostlink()) {
      joinbridgestar()
    } else {
      joinbridgeedge()
    }
    flushpendingincoming()
  }

  dataconnection.on('open', () => {
    void runopen()
  })

  dataconnection.on('close', () => {
    topicbridge?.disconnect()
    topicbridge = undefined
    pendingincoming.length = 0
    untrackpeerconnection(remotepeer)
    if (ishost()) {
      const leftplayer = playerbypeer[remotepeer]
      if (leftplayer) {
        delete peerbyplayer[leftplayer]
        delete playerbypeer[remotepeer]
        broadcastpeerroster()
      }
    }
    if (ispresent(networkpeer)) {
      apilog(SOFTWARE, player, `disconnection from ${remotepeer}`)
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
        await ensurezstdwasm()
        const message = decodepeerwire(bytes)
        const session = peersessionforsessionrewrite()
        const incoming: MESSAGE = {
          ...message,
          session,
        }
        if (ishost() && incoming.target === 'netterminal:peerhello') {
          const data = incoming.data as MAYBE<{
            player?: string
            peerid?: string
          }>
          const helloplayer = data?.player
          const hellopeer = data?.peerid ?? remotepeer
          if (helloplayer && hellopeer === remotepeer) {
            peerbyplayer[helloplayer] = hellopeer
            playerbypeer[hellopeer] = helloplayer
            ensurehostselfonroster()
            broadcastpeerroster()
            rosterchangehandler?.()
          }
          return
        }
        deliverincoming(incoming)
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
      `dataconnection ${dataconnection.peer} - ${JSON.stringify(err)}`,
    )
  })

  void runopen()
}

createdevice('netterminal', [], (message) => {
  if (!networkpeer) {
    return
  }
  const player = registerreadplayer()
  switch (message.target) {
    case 'peerroster': {
      const entries = message.data as MAYBE<PEER_ROSTER_ENTRY[]>
      if (!isarray(entries)) {
        return
      }
      applyrosterentries(entries)
      apilog(
        SOFTWARE,
        player,
        `peer roster ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`,
      )
      ensurejoinclique()
      rosterchangehandler?.()
      break
    }
    case 'peerhello':
      // handled on host wire path; ignore on hub
      break
    default:
      break
  }
})

function netterminalcreate(topicpeerid: string, selfpeerid?: string) {
  const sessionserial = ++netterminalsessionserial
  const player = registerreadplayer()
  const peerid = selfpeerid ?? topicpeerid
  let signalretryattempt = 0
  let restartscheduled = false
  let joinoutsignalconnectdone = false

  subscribetopic = topicpeerid
  clearpeercliquestate()
  vmtopic(SOFTWARE, player, subscribetopic)

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
    clearpeercliquestate()
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
    clearpeercliquestate()
    networkpeer = new Peer(peerid, peerserveroptions())
    registernetterminalunload()

    workstatus(SOFTWARE, player, 'peer dial')

    networkpeer.on('call', (call) => {
      if (!sessionstillactive()) {
        return
      }
      mediacallhandler?.(call)
    })

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
      runpeeropenhandlers()
      if (topicpeerid !== peerid) {
        if (!joinoutsignalconnectdone) {
          joinoutsignalconnectdone = true
          apilog(SOFTWARE, player, `joining topic ${subscribetopic}`)
          const maybedataconnection = networkpeer?.connect(topicpeerid, {
            reliable: true,
          })
          if (ispresent(maybedataconnection)) {
            handledataconnection(maybedataconnection)
          }
        }
      } else {
        apilog(SOFTWARE, player, `hosting topic ${subscribetopic}`)
        ensurehostselfonroster()
      }
      const openpeerid = networkpeer?.id
      if (openpeerid) {
        doasync(SOFTWARE, player, async () => {
          await znsautopublishpeer(openpeerid, player)
        })
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
          clearpeercliquestate()
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

/** Tear down active peer so a soft join can start without page reload. */
export function netterminalhalt() {
  netterminalsessionserial += 1
  netterminalclearallschedule()
  clearpeercliquestate()
  if (ispresent(networkpeer)) {
    networkpeer.destroy()
    networkpeer = undefined
  }
  subscribetopic = ''
}
