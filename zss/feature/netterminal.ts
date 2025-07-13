import { KademliaTable } from 'kademlia-table'
import Peer, { DataConnection } from 'peerjs'
import { hex2arr } from 'uint8-util'
import { api_error, api_log } from 'zss/device/api'
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
import { isarray, ispresent, MAYBE } from 'zss/mapping/types'

type ROUTING_NODE = {
  peer: string
  node: Uint8Array
  dataconnection?: DataConnection
}

// type ROUTING_MESSAGE =
//   | {
//       // server message
//       topic: string
//       pub: true
//       gme: MESSAGE
//     }
//   | {
//       // client message
//       topic: string
//       sub: string
//       gme?: MESSAGE
//     }

let subscribetopic = ''
let networkpeer: MAYBE<Peer>
let topicbridge: MAYBE<ReturnType<typeof createforward>>
let routingtable: MAYBE<KademliaTable<ROUTING_NODE>>
let connectiontable: MAYBE<KademliaTable<ROUTING_NODE>>
const connectiontabletimers: Record<
  string,
  MAYBE<ReturnType<typeof setTimeout>>
> = {}
const connectiontableblocklist = new Map<string, boolean>()
const subscribelastseen = new Map<string, Map<string, number>>()

function handledataconnection(dataconnection: DataConnection) {
  const player = registerreadplayer()

  function handleopen() {
    if (dataconnection.open) {
      clearTimeout(connectiontabletimers[dataconnection.peer])
      if (ispresent(connectiontable) && ispresent(networkpeer)) {
        api_log(SOFTWARE, player, `connection from ${dataconnection.peer}`)
        connectiontable.add({
          peer: dataconnection.peer,
          node: hex2arr(dataconnection.peer),
          dataconnection,
        })
      }
    }
  }

  dataconnection.on('open', handleopen)

  dataconnection.on('close', () => {
    if (ispresent(connectiontable) && ispresent(networkpeer)) {
      api_log(SOFTWARE, player, `disconnection from ${dataconnection.peer}`)
      connectiontable.remove(hex2arr(dataconnection.peer))
    }
  })

  dataconnection.on('data', (msg) => {
    console.info('msg', msg)
    // ROUTING_MESSAGE
    // netterminalmessage(topic, msg as MESSAGE)
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
  const player = registerreadplayer()
  api_log(SOFTWARE, player, `starting netterminal`)

  subscribetopic = createinfohash(topic)

  networkpeer = new Peer(createinfohash(player), { debug: 2 })
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
  })

  // create routing table
  const playernode = hex2arr(networkpeer.id)
  routingtable = new KademliaTable<ROUTING_NODE>(playernode, {
    getId(node) {
      return node.node
    },
  })
  connectiontable = new KademliaTable<ROUTING_NODE>(playernode, {
    getId(node) {
      return node.node
    },
  })
}

export function netterminalhost(topic: string) {
  // restart if needed
  if (ispresent(networkpeer)) {
    netterminalhalt()
  }

  // startup peerjs
  netterminalcreate(topic)

  // open bridge between peers
  topicbridge = createforward((message) => {
    if (
      ispresent(networkpeer) &&
      ispresent(connectiontable) &&
      shouldforwardservertoclient(message) &&
      shouldnotforwardonpeerserver(message) === false
    ) {
      const topicid = hex2arr(subscribetopic)
      const [node] = connectiontable.listClosestToId(topicid, 1)
      if (ispresent(node?.dataconnection)) {
        void node.dataconnection.send({
          topic,
          pub: true,
          gme: message,
        })
      }
    }
  })
}

export function netterminaljoin(topic: string) {
  // restart if needed
  if (ispresent(networkpeer)) {
    netterminalhalt()
  }

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
      const topicid = hex2arr(subscribetopic)
      const [node] = connectiontable.listClosestToId(topicid, 1)
      if (ispresent(node?.dataconnection)) {
        void node.dataconnection.send({
          topic,
          sub: networkpeer.id,
          gme: message,
        })
      }
    }
  })
}

let seektimer: MAYBE<ReturnType<typeof setTimeout>>
function netterminalseek() {
  doasync(SOFTWARE, registerreadplayer(), async () => {
    const player = registerreadplayer()

    const formData = new FormData()
    formData.append('peer', player)
    const request = new Request('https://terminal.zed.cafe', {
      method: 'POST',
      body: formData,
    })
    const response = await fetch(request)
    const list = await response.json()

    // add new peer info
    if (isarray(list) && ispresent(routingtable)) {
      for (let i = 0; i < list.length; ++i) {
        const peer = list[i]
        const node = hex2arr(peer)
        if (!routingtable?.has(node) && !connectiontableblocklist.has(peer)) {
          api_log(SOFTWARE, player, `adding ${list[i]}`)
          routingtable.add({
            peer,
            node,
            dataconnection: undefined,
          })
        }
      }
    }

    // eval current connections
    if (
      !ispresent(networkpeer) ||
      !ispresent(routingtable) ||
      !ispresent(connectiontable)
    ) {
      return
    }

    // lucky 7 top peers
    const CONNECTION_COUNT = 7
    const connectto = routingtable.listClosestToId(
      hex2arr(networkpeer.id),
      CONNECTION_COUNT,
    )

    // scan for new connections
    const activepeers: string[] = []
    for (let i = 0; i < connectto.length; ++i) {
      const entry = connectto[i]
      activepeers.push(entry.peer)
      if (!connectiontable.has(entry.node)) {
        handledataconnection(
          networkpeer.connect(entry.peer, { reliable: true }),
        )
        connectiontabletimers[entry.peer] = setTimeout(() => {
          // drop from routing table
          routingtable?.remove(hex2arr(entry.peer))
          // failture to connect adds to blocklist
          connectiontableblocklist.set(entry.peer, true)
          // signal fail
          api_log(SOFTWARE, player, `failed to connect to ${entry.peer}`)
        }, 5000)
      }
    }

    // scan for stale connections
    const checkentries = connectiontable.listClosestToId(
      hex2arr(networkpeer.id),
      CONNECTION_COUNT * 2,
    )
    for (let i = 0; i < checkentries.length; ++i) {
      const entry = checkentries[i]
      // we cannot find the entry in connectto, then drop it
      if (activepeers.includes(entry.peer) === false) {
        entry.dataconnection?.close()
        connectiontable.remove(entry.node)
      }
    }
  })
  seektimer = setTimeout(netterminalseek, 1000 * 128)
}

export function netterminalhalt() {
  if (!ispresent(networkpeer)) {
    return
  }
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
}
