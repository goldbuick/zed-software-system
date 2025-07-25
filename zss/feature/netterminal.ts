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
import { createinfohash } from 'zss/mapping/guid'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'

type ROUTING_NODE = {
  peer: string
  node: Uint8Array
  dataconnection?: DataConnection
}

type ROUTING_MESSAGE =
  | {
      // server message
      topic: string
      pub: true
      gme: MESSAGE
    }
  | {
      // client message
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

export function netterminaltopic(player: string) {
  return createinfohash(player)
}

let searchping: any
function uplinkstart() {
  function searchpingmsg() {
    const player = registerreadplayer()
    vm_search(SOFTWARE, player)
    api_log(SOFTWARE, player, `uplinking....`)
  }

  // ping the network
  searchpingmsg()

  // create search pulse
  searchping = setInterval(searchpingmsg, 2 * 1000)
}

function uplinkstop() {
  clearInterval(searchping)
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
    if (dataconnection.open) {
      clearTimeout(connectiontabletimers[dataconnection.peer])
      if (ispresent(connectiontable) && ispresent(networkpeer)) {
        api_log(SOFTWARE, player, `connected to ${dataconnection.peer}`)
        connectiontable.add({
          peer: dataconnection.peer,
          node: hex2arr(dataconnection.peer),
          dataconnection,
        })
      }
      // lower seek rate after first connection
      seekrate = 128
    }
  }

  dataconnection.on('open', handleopen)

  dataconnection.on('close', () => {
    if (ispresent(networkpeer) && ispresent(connectiontable)) {
      api_log(SOFTWARE, player, `disconnection from ${dataconnection.peer}`)
      connectiontable.remove(hex2arr(dataconnection.peer))
    }
  })

  dataconnection.on('data', (netmsg) => {
    const msg = netmsg as ROUTING_MESSAGE
    if (
      !ispresent(networkpeer) ||
      !ispresent(routingtable) ||
      !ispresent(connectiontable)
    ) {
      return
    }

    // grab timestamp
    const current = Date.now()
    // ensure we have a list of last seen peer for given topic
    const lastseen =
      subscribelastseen.get(msg.topic) ?? new Map<string, number>()

    // handle message
    if ('pub' in msg) {
      // are we subscribed to this topic ?
      if (msg.topic === subscribetopic && ispresent(msg.gme)) {
        // console.info('pub', msg.gme)
        topicbridgeforward(msg.gme)
      }

      // peers that care about this topic
      for (const [peer, delay] of lastseen) {
        // calc elapsed time
        const delta = current - delay
        if (delta > 1000 * 60) {
          // filter out peers that no longer care about given topic
          lastseen.delete(peer)
        } else {
          // forward message to peer
          const [node] = routingtable.listClosestToId(hex2arr(peer), 1)
          if (ispresent(node.dataconnection)) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            node.dataconnection.send(msg)
          }
        }
      }
    } else if ('sub' in msg) {
      // track that this peer cares about this topic
      lastseen.set(msg.sub, current)

      // add seen peer to routingtable
      const node = hex2arr(msg.sub)
      if (!routingtable.has(node)) {
        routingtable.add({
          peer: msg.sub,
          node,
          dataconnection: undefined,
        })
      }

      // are we the host to this topic ?
      if (msg.topic === networkpeer.id && ispresent(msg.gme)) {
        // console.info('sub', msg.gme)
        topicbridgeforward(msg.gme)
      } else {
        // forwards towards host peer
        const [node] = connectiontable.listClosestToId(hex2arr(msg.topic), 1)
        if (ispresent(node?.dataconnection)) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          node.dataconnection.send(msg)
        }
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

function netterminalcreate(topic: string) {
  // setup topic
  subscribetopic = topic

  // create peer
  const player = registerreadplayer()
  networkpeer = new Peer(netterminaltopic(player), { debug: 2 })

  // attempt disconnect on page close
  window.addEventListener('unload', () => {
    networkpeer?.disconnect()
    networkpeer = undefined
  })

  api_log(SOFTWARE, player, `starting netterminal for ${subscribetopic}`)

  // start gathering peers
  netterminalseek()

  // track possible peerids
  const playernode = hex2arr(networkpeer.id)
  routingtable = new KademliaTable<ROUTING_NODE>(playernode, {
    getId(node) {
      return node.node
    },
  })

  // track active connections
  connectiontable = new KademliaTable<ROUTING_NODE>(playernode, {
    getId(node) {
      return node.node
    },
  })

  networkpeer.on('open', () => {
    api_log(SOFTWARE, registerreadplayer(), `connected to netterminal`)
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
    netterminalhalt()
  })

  networkpeer.on('error', (err) => {
    switch (err.type) {
      case 'peer-unavailable':
        return
    }
    api_error(
      SOFTWARE,
      registerreadplayer(),
      `netterminal`,
      `${networkpeer?.id} - ${JSON.stringify(err)}`,
    )
    // netterminalhalt() ??? maybe ??:
  })
}

export function netterminalhost() {
  const player = registerreadplayer()
  if (ispresent(networkpeer)) {
    api_log(SOFTWARE, player, `netterminal already active`)
    return
  }

  // startup peerjs
  netterminalcreate(netterminaltopic(player))

  // open bridge between peers
  topicbridge = createforward((message) => {
    if (
      ispresent(networkpeer) &&
      ispresent(connectiontable) &&
      shouldforwardservertoclient(message) &&
      shouldnotforwardonpeerserver(message) === false
    ) {
      const [node] = connectiontable.listClosestToId(hex2arr(subscribetopic), 1)
      if (ispresent(node?.dataconnection) && node.dataconnection.open) {
        const netmsg = {
          topic: subscribetopic,
          pub: true,
          gme: message,
        }
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        node.dataconnection.send(netmsg)
      }
    }
  })
}

export function netterminaljoin(topic: string) {
  if (ispresent(networkpeer)) {
    api_log(SOFTWARE, registerreadplayer(), `netterminal already active`)
    return
  }
  // clear search once we start getting messages we care about
  // uplinkstop() - like acklogin

  // startup peerjs
  netterminalcreate(topic)

  // open bridge between peers
  topicbridge = createforward((message) => {
    if (
      ispresent(networkpeer) &&
      ispresent(connectiontable) &&
      shouldforwardclienttoserver(message) &&
      shouldnotforwardonpeerclient(message) === false
    ) {
      const [node] = connectiontable.listClosestToId(hex2arr(subscribetopic), 1)
      if (ispresent(node?.dataconnection) && node.dataconnection.open) {
        const netmsg = {
          topic: subscribetopic,
          sub: networkpeer.id,
          gme: message,
        }
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        node.dataconnection.send(netmsg)
      }
    }
  })

  // start uplink messages ...
  uplinkstart()
}

let seektimer: any
let seekrate = 10
function netterminalseek() {
  doasync(SOFTWARE, registerreadplayer(), async () => {
    if (
      !ispresent(networkpeer) ||
      !ispresent(routingtable) ||
      !ispresent(connectiontable)
    ) {
      return
    }

    const player = registerreadplayer()

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
        const node = hex2arr(peer)
        if (
          networkpeer.id != peer &&
          routingtable.has(node) === false &&
          connectiontableblocklist.has(peer) === false
        ) {
          api_log(SOFTWARE, player, `adding ${peer}`)
          routingtable.add({
            peer,
            node,
            dataconnection: undefined,
          })
        }
      }
    }

    // our route id
    const networknode = hex2arr(networkpeer.id)

    // lucky 7 top peers
    const CONNECTION_COUNT = 7
    const connectto = routingtable.listClosestToId(
      networknode,
      CONNECTION_COUNT,
    )

    // scan for new connections
    const activepeers = new Set<string>()
    for (let i = 0; i < connectto.length; ++i) {
      const entry = connectto[i]
      activepeers.add(entry.peer)
      if (!connectiontable.has(entry.node)) {
        handledataconnection(
          networkpeer.connect(entry.peer, {
            reliable: true,
          }),
        )
      }
    }

    // list *all* connections
    const checkentries = connectiontable.listClosestToId(
      networknode,
      CONNECTION_COUNT * 2,
    )

    // scan for stale connections
    for (let i = 0; i < checkentries.length; ++i) {
      const entry = checkentries[i]
      // we cannot find the entry in connectto, then drop it
      if (activepeers.has(entry.peer) === false) {
        entry.dataconnection?.close()
        connectiontable.remove(entry.node)
      }
    }
  })
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
