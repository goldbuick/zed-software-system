/**
 * Server-side netterminal: PeerJS host using storage-server for peer ID.
 * Uses official peerjs + @roamhq/wrtc polyfill. No idb-keyval, no window.
 */
import 'zss/feature/peerjs-node-polyfill'
import peerjs from 'peerjs'
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
import {
  rackregister,
  registerreadplayer,
} from 'zss/device/rackregister'
import { SOFTWARE } from 'zss/device/session'
import { storagereadnetid, storagewritenetid } from 'zss/feature/storage-server'
import { doasync } from 'zss/mapping/func'
import { createinfohash } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

const Peer = (peerjs as { Peer?: typeof peerjs }).Peer ?? peerjs

async function readpeerid(): Promise<string | undefined> {
  return storagereadnetid()
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

let networkpeer: MAYBE<InstanceType<typeof Peer>>

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
        let payload = message
        // Flatten data to avoid PeerJS binarypack stack overflow on deep gadget state
        if (
          (message.target === 'paint' || message.target === 'patch') &&
          message.data !== undefined
        ) {
          payload = {
            ...message,
            data: JSON.stringify(message.data),
          }
        }
        void dataconnection.send(payload)
      }
    })
    // Request fresh paint so joiner gets initial display state
    gadgetserverdesync(rackregister, player)
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
    const message = netmsg as MESSAGE
    if (!ispresent(networkpeer)) {
      return
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
  subscribetopic = topicpeerid
  vmtopic(SOFTWARE, registerreadplayer(), subscribetopic)

  const player = registerreadplayer()
  const peerid = selfpeerid ?? topicpeerid
  networkpeer = new Peer(peerid, {
    debug: 2,
    host: 'terminal.zed.cafe',
  })

  apilog(SOFTWARE, player, `netterminal for ${peerid}`)

  networkpeer.on('open', () => {
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

  networkpeer.on('connection', handledataconnection)

  networkpeer.on('disconnected', () => {
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

  networkpeer.on('error', (err: any) => {
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

  netterminalcreate(topicpeerid)
}
