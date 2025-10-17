import { get as idbget, update as idbupdate } from 'idb-keyval'
import { KademliaTable } from 'kademlia-table'
import Peer, { DataConnection } from 'peerjs'
import { hex2arr } from 'uint8-util'
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
import { createinfohash, createsid } from 'zss/mapping/guid'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'

// read / write from indexdb

async function readpeerid(): Promise<string | undefined> {
  return idbget('peerid')
}

async function writepeerid(
  updater: (oldValue: string | undefined) => string,
): Promise<void> {
  return idbupdate('peerid', updater)
}

type ROUTING_NODE = {
  peer: string
  id: Uint8Array
  dataconnection?: DataConnection
}

type ROUTING_MESSAGE =
  | {
      // connection ping message
      id: string
      topic: string
      ping: string
    }
  | {
      // connection ping message
      id: string
      topic: string
      pong: string
    }
  | {
      // server message
      id: string
      topic: string
      pub: string
      gme: MESSAGE
    }
  | {
      // client message
      id: string
      topic: string
      sub: string
      gme?: MESSAGE
    }

let subscribetopic = ''
let networkpeer: MAYBE<Peer>
let topicbridge: MAYBE<ReturnType<typeof createforward>>
let routingtable: MAYBE<KademliaTable<ROUTING_NODE>>
let connectiontable: MAYBE<KademliaTable<ROUTING_NODE>>
const connectiontabletimers: Record<string, any> = {}
const connectiontableblocklist = new Map<string, boolean>()
const subscribelastseen = new Map<string, Map<string, number>>()

function othernodeslist(peer: string) {
  if (!ispresent(connectiontable)) {
    return []
  }
  return connectiontable
    .listClosestToId(hex2arr(peer), 1)
    .filter((node) => node.peer !== networkpeer?.id)
}

export function netterminaltopic(player: string) {
  return createinfohash(player)
}

let searchping: any
function uplinkstart() {
  // already searching OR if we are the host, skip it
  if (ispresent(searchping) || networkpeer?.id === subscribetopic) {
    return
  }

  // drop seek rate once we have an open connection
  seekrate = 128

  function searchpingmsg() {
    const player = registerreadplayer()
    vm_search(SOFTWARE, player)
    api_log(SOFTWARE, player, `uplinking....`)
  }

  // ping the network
  searchpingmsg()

  // create search pulse
  searchping = setInterval(searchpingmsg, 5 * 1000)
}

function uplinkstop() {
  clearInterval(searchping)
  searchping = undefined
}

function topicroutetowards(peer: string, netmsg: ROUTING_MESSAGE) {
  if (!ispresent(networkpeer) || !ispresent(connectiontable)) {
    return
  }

  // forward message to peer
  const nodes = othernodeslist(peer)
  for (let i = 0; i < nodes.length; ++i) {
    const node = nodes[i]
    if (node.peer !== networkpeer.id && node.dataconnection?.open) {
      const pipe = node.dataconnection?.send(netmsg)
      pipe?.catch((err) => console.error(err))
    }
  }
}

function topiclastseenforward(netmsg: ROUTING_MESSAGE) {
  if (!ispresent(networkpeer) || !ispresent(connectiontable)) {
    return
  }

  // current timestamp
  const current = Date.now()
  const lastseen =
    subscribelastseen.get(subscribetopic) ?? new Map<string, number>()

  // peers that care about this topic
  for (const [peer, delay] of lastseen) {
    // calc elapsed time
    const delta = current - delay
    if (delta > 1000 * 60) {
      // filter out peers that no longer care about given topic
      lastseen.delete(peer)
    } else {
      // forward message to peer
      topicroutetowards(peer, netmsg)
    }
  }
}

function topicbridgeforward(message: MESSAGE) {
  topicbridge?.forward({
    ...message,
    // translate to software session
    session: SOFTWARE.session(),
  })
  if (message.target.includes('acklogin')) {
    uplinkstop()
  }
}

const CONNECTION_TIMEOUT = 5000
function handledataconnection(dataconnection: DataConnection) {
  const player = registerreadplayer()

  connectiontabletimers[dataconnection.peer] = setTimeout(() => {
    // drop from routing table
    routingtable?.remove(hex2arr(dataconnection.peer))
    // failture to connect adds to blocklist
    connectiontableblocklist.set(dataconnection.peer, true)
    // signal fail
    api_log(SOFTWARE, player, `failed to connect to ${dataconnection.peer}`)
  }, CONNECTION_TIMEOUT)

  function handleopen() {
    if (
      dataconnection.open &&
      ispresent(connectiontable) &&
      ispresent(networkpeer)
    ) {
      api_log(SOFTWARE, player, `connection ${dataconnection.peer} open`)
      connectiontable.add({
        peer: dataconnection.peer,
        id: hex2arr(dataconnection.peer),
        dataconnection,
      })
      // confirm connection
      const ping: ROUTING_MESSAGE = {
        id: createsid(),
        topic: subscribetopic,
        ping: networkpeer.id,
      }
      const pipe = dataconnection.send(ping)
      pipe?.catch((err) => console.error(err))
      // start trying to join session
      uplinkstart()
    }
  }

  dataconnection.on('open', handleopen)

  dataconnection.on('close', () => {
    if (ispresent(networkpeer) && ispresent(connectiontable)) {
      api_log(SOFTWARE, player, `disconnection from ${dataconnection.peer}`)
      connectiontable.remove(hex2arr(dataconnection.peer))
    }
  })

  const syncids = new Set<string>()
  dataconnection.on('data', (netmsg) => {
    const msg = netmsg as ROUTING_MESSAGE
    if (
      syncids.has(msg.id) ||
      !ispresent(networkpeer) ||
      !ispresent(routingtable) ||
      !ispresent(connectiontable)
    ) {
      return
    }

    // update sync ids
    syncids.add(msg.id)

    // current timestamp
    const current = Date.now()
    const lastseen =
      subscribelastseen.get(subscribetopic) ?? new Map<string, number>()

    // handle message
    if ('ping' in msg) {
      if (msg.topic === subscribetopic && msg.ping !== networkpeer.id) {
        const pong: ROUTING_MESSAGE = {
          id: createsid(),
          topic: subscribetopic,
          pong: networkpeer.id,
        }
        const pipe = dataconnection.send(pong)
        pipe?.catch((err) => console.error(err))
      }
    } else if ('pong' in msg) {
      clearTimeout(connectiontabletimers[msg.pong])
      api_log(SOFTWARE, player, `connected to ${dataconnection.peer}`)
    } else if ('pub' in msg) {
      // see if we care about the topic
      if (msg.topic === subscribetopic) {
        topicbridgeforward(msg.gme)
      }

      // peers that care about this topic
      topiclastseenforward(msg)
    } else if ('sub' in msg) {
      // track that this peer cares about this topic
      lastseen.set(msg.sub, current)

      // add seen peer to routingtable
      const id = hex2arr(msg.sub)
      if (!routingtable.has(id)) {
        routingtable.add({
          peer: msg.sub,
          id,
          dataconnection: undefined,
        })
      }

      // are we the host to this topic ?
      if (msg.topic === networkpeer.id) {
        if (ispresent(msg.gme)) {
          topicbridgeforward(msg.gme)
        }
      } else {
        // forwards towards host peer
        topicroutetowards(msg.topic, msg)
      }
    }

    // update last seen for given topic
    subscribelastseen.set(msg.topic, lastseen)
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

function netterminalcreate(topic: string, selftopic: string) {
  // setup topic
  subscribetopic = topic

  // create peer
  const player = registerreadplayer()
  networkpeer = new Peer(selftopic, { debug: 2 })

  // attempt disconnect on page close
  window.addEventListener('unload', () => {
    networkpeer?.disconnect()
    networkpeer = undefined
  })

  api_log(SOFTWARE, player, `netterminal for ${selftopic}`)
  api_log(SOFTWARE, player, `session topic ${subscribetopic}`)

  // track possible peerids
  routingtable = new KademliaTable<ROUTING_NODE>(hex2arr(networkpeer.id), {
    getId(node) {
      return node.id
    },
  })

  // track active connections
  connectiontable = new KademliaTable<ROUTING_NODE>(hex2arr(networkpeer.id), {
    getId(node) {
      return node.id
    },
  })

  networkpeer.on('open', () => {
    api_log(SOFTWARE, registerreadplayer(), `connected to netterminal`)
    // start gathering peers
    netterminalseek()
  })

  networkpeer.on('connection', handledataconnection)

  networkpeer.on('call', () => {
    // incoming call connection
    // this will be used for screenshare
  })

  networkpeer.on('disconnected', () => {
    api_error(
      SOFTWARE,
      registerreadplayer(),
      `netterminal`,
      `lost connection to netterminal`,
    )
    setTimeout(() => {
      api_error(
        SOFTWARE,
        registerreadplayer(),
        `netterminal`,
        `retrying the connection to netterminal`,
      )
      networkpeer?.reconnect()
    }, 5000)
  })

  networkpeer.on('error', (err) => {
    switch (err.type) {
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
      registerreadplayer(),
      `netterminal`,
      `${networkpeer?.id} - ${JSON.stringify(err)}`,
    )
  })
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function netterminalhost() {
  const player = registerreadplayer()
  if (ispresent(networkpeer)) {
    api_log(SOFTWARE, player, `netterminal already active`)
    return
  }

  // read cached id
  // let maybepeerid = await readpeerid()
  // maybepeerid ??= player

  // // write id to cache
  // await writepeerid(() => maybepeerid ?? '')

  // startup peerjs
  const withtopic = netterminaltopic(player)
  netterminalcreate(withtopic, withtopic)

  // open bridge between peers
  topicbridge = createforward((message) => {
    if (
      ispresent(networkpeer) &&
      ispresent(connectiontable) &&
      shouldforwardservertoclient(message) &&
      shouldnotforwardonpeerserver(message) === false
    ) {
      // forward to topic subscribers
      const netmsg: ROUTING_MESSAGE = {
        id: createsid(),
        topic: subscribetopic,
        pub: networkpeer.id,
        gme: message,
      }
      topiclastseenforward(netmsg)
    }
  })
}

export function netterminaljoin(topic: string) {
  const player = registerreadplayer()
  if (ispresent(networkpeer)) {
    api_log(SOFTWARE, player, `netterminal already active`)
    return
  }

  // startup peerjs
  netterminalcreate(topic, netterminaltopic(player))

  // open bridge between peers
  topicbridge = createforward((message) => {
    if (
      ispresent(networkpeer) &&
      ispresent(connectiontable) &&
      shouldforwardclienttoserver(message) &&
      shouldnotforwardonpeerclient(message) === false
    ) {
      // forwards towards host
      const nodes = othernodeslist(subscribetopic)
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i]
        if (node.dataconnection?.open) {
          const netmsg: ROUTING_MESSAGE = {
            id: createsid(),
            topic: subscribetopic,
            sub: networkpeer.id,
            gme: message,
          }
          const pipe = node.dataconnection.send(netmsg, true)
          pipe?.catch((err) => console.error(err))
        }
      }
    }
  })
}

let seektimer: any
let seekrate = 16
function netterminalseek() {
  const player = registerreadplayer()
  doasync(SOFTWARE, player, async () => {
    if (
      !ispresent(networkpeer) ||
      !ispresent(routingtable) ||
      !ispresent(connectiontable)
    ) {
      return
    }

    // list our id as active
    const formData = new FormData()
    // add prefix
    formData.append('peer', `pid_${networkpeer.id}`)
    // submit id and get a list of ids to try in return
    const request = new Request('https://terminal.zed.cafe', {
      method: 'POST',
      body: formData,
    })
    const response = await fetch(request)
    const list: MAYBE<string[]> = await response.json()

    // add new peer info
    if (isarray(list)) {
      for (let i = 0; i < list.length; ++i) {
        // strip prefix
        const peer = list[i].replace('pid_', '')
        const id = hex2arr(peer)
        if (
          networkpeer.id != peer &&
          routingtable.has(id) === false &&
          connectiontableblocklist.has(peer) === false
        ) {
          api_log(SOFTWARE, player, `adding ${peer}`)
          routingtable.add({
            peer,
            id,
            dataconnection: undefined,
          })
        }
      }
    }

    // our route id
    const networknode = hex2arr(networkpeer.id)

    // lucky 7 top peers
    const CONNECTION_COUNT = 7
    const connectto = routingtable
      .listClosestToId(networknode, CONNECTION_COUNT)
      .filter((node) => node.peer !== networkpeer?.id)

    // scan for new connections
    const activepeers = new Set<string>()
    for (let i = 0; i < connectto.length; ++i) {
      const entry = connectto[i]
      activepeers.add(entry.peer)
      if (!connectiontable.has(entry.id)) {
        handledataconnection(
          networkpeer.connect(entry.peer, {
            reliable: true,
          }),
        )
      }
    }

    // list *all* connections
    const checkentries = connectiontable
      .listClosestToId(networknode, CONNECTION_COUNT * 2)
      .filter((node) => node.peer !== networkpeer?.id)

    // scan for stale connections
    for (let i = 0; i < checkentries.length; ++i) {
      const entry = checkentries[i]
      // we cannot find the entry in connectto, then drop it
      if (activepeers.has(entry.peer) === false) {
        entry.dataconnection?.close()
        connectiontable.remove(entry.id)
      }
    }
  })

  // gather it up
  seektimer = setTimeout(netterminalseek, seekrate * 1000)
}

export function netterminalhalt() {
  if (!ispresent(networkpeer)) {
    return
  }
  // clear topic info
  subscribetopic = ''
  subscribelastseen.clear()
  connectiontableblocklist.clear()
  // clear seek
  clearTimeout(seektimer)
  networkpeer.destroy()
  networkpeer = undefined
  // clear routing & connection table
  routingtable = undefined
  connectiontable = undefined
  // close bridge between peers
  topicbridge?.disconnect()
  topicbridge = undefined
  // stop bootstrap msg
  uplinkstop()
}
