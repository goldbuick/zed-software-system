import Peer, { DataConnection } from 'peerjs'
import { MESSAGE, apierror, apilog, vmsearch, vmtopic } from 'zss/device/api'
import {
  createforward,
  shouldforwardclienttoserver,
  shouldforwardservertoclient,
  shouldnotforwardonpeerclient,
  shouldnotforwardonpeerserver,
} from 'zss/device/forward'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { storagereadnetid, storagewritenetid } from 'zss/feature/storage'
import { doasync } from 'zss/mapping/func'
import { createinfohash } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

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

function ishost() {
  return networkpeer?.id === subscribetopic
}

function netterminaltopic(player: string) {
  return createinfohash(player)
}

/** Convert only Set & Map so PeerJS binary pack does not hit "Type Set not yet supported". Leaves Uint8Array etc. alone. */
function serializable<T>(value: T): T {
  if (value instanceof Set) {
    return [...value] as T
  }
  if (value instanceof Map) {
    return Object.fromEntries(value) as T
  }
  if (Array.isArray(value)) {
    return value.map(serializable) as T
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    (value as object).constructor === Object
  ) {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as object)) {
      out[k] = serializable((value as Record<string, unknown>)[k])
    }
    return out as T
  }
  return value
}

function sendpeer(dataconnection: DataConnection, message: MESSAGE): void {
  void dataconnection.send(serializable(message))
}

function handledataconnection(dataconnection: DataConnection) {
  const player = registerreadplayer()
  let topicbridge: MAYBE<ReturnType<typeof createforward>>

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
        sendpeer(dataconnection, message)
      }
    })
  }

  function joinbridge() {
    // open bridge between peers
    topicbridge = createforward((message) => {
      if (!ispresent(networkpeer)) {
        return
      }
      if (
        shouldforwardclienttoserver(message) &&
        shouldnotforwardonpeerclient(message) === false
      ) {
        sendpeer(dataconnection, message)
      }
    })
    // signal ready to login
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
    // Server may send gadgetclient:paint/patch as JSON string (avoids binarypack stack overflow)
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

function netterminalcreate(topicpeerid: string, selfpeerid?: string) {
  // setup topic
  subscribetopic = topicpeerid
  vmtopic(SOFTWARE, registerreadplayer(), subscribetopic)

  // create peer
  const player = registerreadplayer()
  const peerid = selfpeerid ?? topicpeerid
  networkpeer = new Peer(peerid, {
    debug: 2,
    host: 'terminal.zed.cafe',
    secure: true,
    port: 443,
  })

  // attempt disconnect on page close
  window.addEventListener('unload', () => {
    networkpeer?.disconnect()
    networkpeer = undefined
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

  networkpeer.on('error', (err) => {
    switch (err.type) {
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
  if (!ispresent(networkpeer)) {
    return
  }
  // clear topic info
  subscribetopic = ''
  vmtopic(SOFTWARE, registerreadplayer(), subscribetopic)
  // clear coms
  networkpeer.destroy()
  networkpeer = undefined
}
