import { KademliaTable } from 'kademlia-table'
import Peer from 'peerjs'
import { arr2hex, hex2arr, randomBytes } from 'uint8-util'
import {
  MESSAGE,
  api_log,
  bridge_showjoincode,
  bridge_tabopen,
  vm_search,
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
import { createinfohash } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'

type ROUTING_NODE = {
  peer: Peer
  node: Uint8Array
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

const selfnode = createinfohash(registerreadplayer())
const routingtable = new KademliaTable<ROUTING_NODE>(hex2arr(selfnode), {
  getId(entry) {
    return entry.node
  },
})

// finder.on('peerconnect', (peer) => {
//   api_log(SOFTWARE, registerreadplayer(), `remote connected ${peer.id}`)
//   routingtable.add({ id: peerstringtobytes(peer.id), peer })
// })

// finder.on('peerclose', (peer) => {
//   api_log(SOFTWARE, registerreadplayer(), `remote closed ${peer.id}`)
//   routingtable.remove(peerstringtobytes(peer.id))
// })

// general routing info
let subscribetopic = ''
const subscribelastseen = new Map<string, Map<string, number>>()
// finder.on('msg', (_, msg: ROUTING_MESSAGE) => {

// })

// finder.on('trackerconnect', (tracker, stats) => {
//   api_log(
//     SOFTWARE,
//     registerreadplayer(),
//     `looking for players ${createinfohash(tracker.announceUrl)} [${stats.connected}]`,
//   )
// })
// finder.on('trackerwarning', console.info)

// topic related state
let isstarted = false
let topicbridge: MAYBE<ReturnType<typeof createforward>>
let searchping: any

function peersearchstart(player: string) {
  function searchpingmsg() {
    vm_search(SOFTWARE, player)
  }

  // ping the network
  searchpingmsg()

  // create search pulse
  searchping = setInterval(searchpingmsg, 5 * 1000)
}

function peersearchstop() {
  clearInterval(searchping)
}

function peerusehost(host: string) {
  if (!isstarted) {
    isstarted = true
    subscribetopic = host
    // finder.start()
    api_log(
      SOFTWARE,
      registerreadplayer(),
      `connecting to hubworld for ${host}`,
    )
  }
}

function peerpublishmessage(topic: string, gme: MESSAGE) {
  const target = createinfohash(topic)
  // forwards towards topic host peer
  const [node] = routingtable.listClosestToId(hex2arr(target), 1)
  if (ispresent(node)) {
    // finder.send(node.peer, { topic, pub: true, gme }).catch(() => {
    //   // console.error
    // })
  }
}

export function peerserver(hidden: boolean, tabopen: boolean) {
  // setup host
  peerusehost(selfnode)

  // bytestocontentstring

  // show join code
  bridge_showjoincode(SOFTWARE, registerreadplayer(), hidden, host)
  if (tabopen) {
    bridge_tabopen(SOFTWARE, registerreadplayer(), host)
  }

  // open bridge between peers
  topicbridge = createforward((message) => {
    if (
      shouldforwardservertoclient(message) &&
      shouldnotforwardonpeerserver(message) === false
    ) {
      peerpublishmessage(host, message)
    }
  })
}

function peersubscribemessage(topic: string, sub: string, gme: MESSAGE) {
  // forwards towards topic host peer
  const [node] = routingtable.listClosestToId(peerstringtobytes(topic), 1)
  if (ispresent(node)) {
    finder.send(node.peer, { topic, sub, gme }).catch(console.error)
  }
}

export function peerclient(host: string, player: string) {
  // setup host
  peerusehost(host)

  // open bridge between peers
  topicbridge = createforward((message) => {
    if (
      shouldforwardclienttoserver(message) &&
      shouldnotforwardonpeerclient(message) === false
    ) {
      peersubscribemessage(host, finder._peerId, message)
    }
  })

  setTimeout(() => peersearchstart(player), 1000)
}

export function peerleave() {
  peersearchstop()
  // close bridge between peers
  topicbridge?.disconnect()
  topicbridge = undefined
}
