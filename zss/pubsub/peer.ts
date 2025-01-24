import { KademliaTable } from 'kademlia-table'
import P2PT, { Peer } from 'p2pt'
import { hex2arr } from 'uint8-util'
import { MESSAGE, network_showjoincode } from 'zss/device/api'
import { createforward } from 'zss/device/forward'
import { SOFTWARE } from 'zss/device/session'
import { ispresent, MAYBE } from 'zss/mapping/types'
import { write } from 'zss/words/writeui'

const trackerlist = `
wss://tracker.btorrent.xyz
wss://tracker.webtorrent.dev
wss://tracker.openwebtorrent.com
`
  .split('\n')
  .map((item) => item.trim())
  .filter((item) => item)

function peerstringtobytes(peer: string) {
  return hex2arr(peer)
}

type ROUTING_NODE = {
  id: Uint8Array
  peer: Peer
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

const hubworld = `hubworld_${import.meta.env.ZSS_COMMIT_HASH}`
const finder = new P2PT<ROUTING_MESSAGE>(trackerlist, hubworld)
const routingtable = new KademliaTable<ROUTING_NODE>(
  peerstringtobytes(finder._peerId),
  {
    getId(node) {
      return node.id
    },
  },
)

finder.on('peerconnect', (peer) => {
  routingtable.add({ id: peerstringtobytes(peer.id), peer })
})

finder.on('peerclose', (peer) => {
  routingtable.remove(peerstringtobytes(peer.id))
})

// general routing info
const sublastseen = new Map<string, Map<string, number>>()
finder.on('msg', (peer, msg: ROUTING_MESSAGE) => {
  console.info('msg gme', msg.gme)
  // grab timestamp
  const current = Date.now()

  // ensure we have a list of last seen peer for given topic
  const lastseen = sublastseen.get(msg.topic) ?? new Map<string, number>()

  // filter out peers that no longer care about given topic
  for (const [peerid, delay] of lastseen) {
    const delta = current - delay
    if (delta > 1000 * 60) {
      lastseen.delete(peerid)
    }
  }

  if ('pub' in msg) {
    // forward message to system
    if (msg.topic === topic && ispresent(msg.gme)) {
      console.info('maybe bridge AAAA ???', msg.gme)
    }

    // build an aggregate list of peers to forward to
    const nextpeers = new Set<Peer>()
    for (const [peerid] of lastseen) {
      const nodes = routingtable.listClosestToId(peerstringtobytes(peerid), 5)
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].peer !== peer) {
          nextpeers.add(nodes[i].peer)
        }
      }
    }

    // forward message to all peers that care about given topic
    for (const peer of nextpeers) {
      finder.send(peer, msg).catch(console.error)
    }
  } else if ('sub' in msg) {
    // write to list of last seen peer for given topic
    lastseen.set(msg.sub, current)
    // handoff message
    if (istopichost) {
      // forward message to system
      if (msg.topic === topic && ispresent(msg.gme)) {
        console.info('maybe bridge AAAA ???', msg.gme)
      }
    } else {
      // forwards towards topic host peer
      const nodes = routingtable.listClosestToId(
        peerstringtobytes(msg.topic),
        5,
      )
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].peer !== peer) {
          finder.send(nodes[i].peer, msg).catch(console.error)
        }
      }
    }
  }

  // update last seen for given topic
  sublastseen.set(msg.topic, lastseen)
})

finder.on('trackerconnect', console.info)
finder.on('trackerwarning', console.info)

// topic related state
let topic = ''
let topicplayer = ''
let isstarted = false
let istopichost = false
let topicbridge: MAYBE<ReturnType<typeof createforward>>

function peerusehost(host: string, player: string) {
  if (!isstarted) {
    isstarted = true
    topicplayer = player
    topic = host
    istopichost = host === finder._peerId
    finder.start()
    write(SOFTWARE, `${topicplayer} connecting to hubworld for ${host}`)
  }
}

function peerpublishmessage(gme: MESSAGE) {
  // forwards towards topic host peer
  const nodes = routingtable.listClosestToId(peerstringtobytes(topic), 5)
  for (let i = 0; i < nodes.length; i++) {
    finder.send(nodes[i].peer, { topic, pub: true, gme }).catch(console.error)
  }
}

export function peerstart(player: string) {
  peerusehost(finder._peerId, player)
  network_showjoincode(SOFTWARE, topic, player)
  // open bridge between peers
  topicbridge = createforward((message) => {
    switch (message.target) {
      case 'vm:cli':
      case 'vm:doot':
      case 'vm:input':
      case 'vm:login':
      case 'vm:endgame': {
        peerpublishmessage(message)
        break
      }
      default:
        break
    }
  })
}

function peersubscribemessage(sub: string, gme?: MESSAGE) {
  // forwards towards topic host peer
  const nodes = routingtable.listClosestToId(peerstringtobytes(topic), 5)
  for (let i = 0; i < nodes.length; i++) {
    finder.send(nodes[i].peer, { topic, sub, gme }).catch(console.error)
  }
}

function peersubscribe() {
  if (!topic) {
    return
  }

  // forwards towards topic host peer
  peersubscribemessage(finder._peerId)

  // not sure how slow of a poll this should be
  setTimeout(peersubscribe, 1000 * 3)
}

export function peerjoin(host: string, player: string) {
  peerusehost(host, player)
  peersubscribe()
  // open bridge between peers
  topicbridge = createforward((message) => {
    switch (message.target) {
      case 'vm:cli':
      case 'vm:doot':
      case 'vm:input':
      case 'vm:login':
      case 'vm:endgame': {
        peersubscribemessage(finder._peerId, message)
        break
      }
      default:
        break
    }
  })
}

export function peerleave() {
  topic = ''
  // close bridge between peers
  topicbridge?.disconnect()
  topicbridge = undefined
}
