import { get as idbget, update as idbupdate } from 'idb-keyval'
import Peer, { DataConnection } from 'peerjs'
import { MESSAGE, api_error, api_log, vm_search } from 'zss/device/api'
import {
  createforward,
  shouldforwardclienttoserver,
  shouldforwardservertoclient,
  shouldnotforwardonpeerclient,
  shouldnotforwardonpeerserver,
} from 'zss/device/forward'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { doasync } from 'zss/mapping/func'
import { createinfohash } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

// read / write from indexdb

async function readpeerid(): Promise<string | undefined> {
  return idbget('netid')
}

async function writepeerid(
  updater: (oldValue: string | undefined) => string,
): Promise<void> {
  return idbupdate('netid', updater)
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
        void dataconnection.send(message)
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
        void dataconnection.send(message)
      }
    })
    // signal ready to login
    vm_search(SOFTWARE, player)
  }

  function handleopen() {
    if (!dataconnection.open) {
      return
    }
    api_log(SOFTWARE, player, `connection ${dataconnection.peer} open`)
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
      api_log(SOFTWARE, player, `disconnection from ${dataconnection.peer}`)
    }
  })

  dataconnection.on('data', (netmsg: any) => {
    const message = netmsg as MESSAGE
    if (!ispresent(networkpeer)) {
      return
    }
    // bridge incoming messages from other peers
    topicbridge?.forward({
      ...message,
      // translate to software session
      session: SOFTWARE.session(),
    })
  })

  dataconnection.on('error', (err) => {
    api_error(
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

  // create peer
  const player = registerreadplayer()
  const peerid = selfpeerid ?? topicpeerid
  networkpeer = new Peer(peerid, { debug: 2 })

  // attempt disconnect on page close
  window.addEventListener('unload', () => {
    networkpeer?.disconnect()
    networkpeer = undefined
  })

  api_log(SOFTWARE, player, `netterminal for ${peerid}`)

  networkpeer.on('open', () => {
    api_log(SOFTWARE, player, `connected to netterminal`)
    if (topicpeerid !== peerid) {
      api_log(SOFTWARE, player, `joining topic ${subscribetopic}`)
      const maybedataconnection = networkpeer?.connect(topicpeerid, {
        reliable: true,
      })
      if (ispresent(maybedataconnection)) {
        handledataconnection(maybedataconnection)
      }
    } else {
      api_log(SOFTWARE, player, `hosting topic ${subscribetopic}`)
    }
  })

  networkpeer.on('connection', handledataconnection)

  networkpeer.on('disconnected', () => {
    api_error(SOFTWARE, player, `netterminal`, `lost connection to netterminal`)
    setTimeout(() => {
      api_error(
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
    api_error(
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
    api_log(SOFTWARE, player, `netterminal already active`)
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
    api_log(SOFTWARE, player, `netterminal already active`)
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
  // clear coms
  networkpeer.destroy()
  networkpeer = undefined
}
