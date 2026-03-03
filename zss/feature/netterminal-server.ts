/**
 * Server-side netterminal: PeerJS host using storage-server for peer ID.
 * Uses official peerjs + @roamhq/wrtc polyfill. No idb-keyval, no window.
 * PeerJS is loaded dynamically so the polyfill runs before it.
 */
import 'zss/feature/peerjs-node-polyfill'
import type { DataConnection } from 'peerjs'
import {
  MESSAGE,
  apierror,
  apilog,
  gadgetserverdesync,
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
import { register, registerreadplayer } from 'zss/device/rackregister'
import { SOFTWARE } from 'zss/device/session'
import { storagereadnetid, storagewritenetid } from 'zss/feature/storage-server'
import { doasync } from 'zss/mapping/func'
import { createinfohash } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

let PeerConstructor: typeof import('peerjs').default | null = null

async function getPeer(): Promise<
  typeof import('peerjs').default | { Peer: typeof import('peerjs').default }
> {
  if (!PeerConstructor) {
    const m = await import('peerjs')
    PeerConstructor = m.default
  }
  return PeerConstructor
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Peer instance from dynamic import
let networkpeer: MAYBE<any>

function ishost() {
  return networkpeer?.id === subscribetopic
}

function netterminaltopic(player: string) {
  return createinfohash(player)
}

function handledataconnection(dataconnection: DataConnection) {
  const player = registerreadplayer()
  let topicbridge: MAYBE<ReturnType<typeof createforward>>

  function hostbridge() {
    topicbridge = createforward((message) => {
      if (!ispresent(networkpeer)) {
        return
      }
      if (
        shouldforwardservertoclient(message) &&
        shouldnotforwardonpeerserver(message) === false
      ) {
        // peerjs-js-binarypack recurses on deep objects; Node's smaller stack overflows.
        // Stringify gadget state so binarypack gets a flat string.
        const target =
          typeof message === 'object' && message !== null && 'target' in message
            ? String((message as { target?: string }).target)
            : ''
        const payload =
          target === 'gadgetclient:paint' || target === 'gadgetclient:patch'
            ? JSON.stringify(message)
            : message
        void dataconnection.send(payload)
      }
    })
    // Request fresh paint so joiner gets initial display state
    gadgetserverdesync(register, player)
  }

  function joinbridge() {
    topicbridge = createforward((message) => {
      if (!ispresent(networkpeer)) {
        return
      }
      if (
        shouldforwardclienttoserver(message) &&
        shouldnotforwardonpeerclient(message) === false
      ) {
        void dataconnection.send(message)
      }
    })
    vmsearch(SOFTWARE, player)
  }

  function handleopen() {
    if (!dataconnection.open) {
      return
    }
    apilog(SOFTWARE, player, `connection ${dataconnection.peer} open`)
    if (ishost()) {
      hostbridge()
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
  })

  dataconnection.on('data', (netmsg: any) => {
    if (!ispresent(networkpeer)) {
      return
    }
    const message = (
      typeof netmsg === 'string' ? JSON.parse(netmsg) : netmsg
    ) as MESSAGE
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

async function netterminalcreate(topicpeerid: string, selfpeerid?: string) {
  subscribetopic = topicpeerid
  vmtopic(SOFTWARE, registerreadplayer(), subscribetopic)

  const player = registerreadplayer()
  const peerid = selfpeerid ?? topicpeerid
  const m = await getPeer()
  const PeerClass = (m as { Peer?: typeof m }).Peer ?? m
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- Peer from dynamic import
  networkpeer = new (PeerClass as any)(peerid, {
    debug: 2,
    host: 'terminal.zed.cafe',
  })

  apilog(SOFTWARE, player, `netterminal for ${peerid}`)

  networkpeer!.on('open', () => {
    apilog(SOFTWARE, player, `connected to netterminal`)
    if (topicpeerid !== peerid) {
      apilog(SOFTWARE, player, `joining topic ${subscribetopic}`)
      const maybedataconnection = networkpeer?.connect(topicpeerid, {
        reliable: true,
      })
      if (ispresent(maybedataconnection)) {
        handledataconnection(maybedataconnection)
      }
    } else {
      apilog(SOFTWARE, player, `hosting topic ${subscribetopic}`)
    }
  })

  networkpeer!.on('connection', handledataconnection)

  networkpeer!.on('disconnected', () => {
    apierror(SOFTWARE, player, `netterminal`, `lost connection to netterminal`)
    setTimeout(() => {
      apierror(
        SOFTWARE,
        player,
        `netterminal`,
        `retrying the connection to netterminal`,
      )
      networkpeer?.reconnect()
    }, 5000)
  })

  networkpeer!.on('error', (err: any) => {
    switch (err?.type) {
      case 'disconnected':
      case 'peer-unavailable':
        return
      case 'invalid-id':
      case 'unavailable-id':
        doasync(SOFTWARE, player, async () => {
          await writepeerid(() => '')
        })
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

export async function netterminalhost() {
  const player = registerreadplayer()
  if (ispresent(networkpeer)) {
    apilog(SOFTWARE, player, `netterminal already active`)
    return
  }

  let stickypeerid = await readpeerid()
  stickypeerid = (stickypeerid ?? '') || player

  await writepeerid(() => stickypeerid ?? '')

  const topicpeerid = netterminaltopic(stickypeerid ?? player)

  await netterminalcreate(topicpeerid)
}
