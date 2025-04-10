import { KademliaTable } from 'kademlia-table'
import P2PT, { Peer } from 'p2pt'
import { hex2arr } from 'uint8-util'
import { createmessage } from 'zss/device'
import { MESSAGE, bridge_showjoincode, bridge_tabopen } from 'zss/device/api'
import {
  createforward,
  shouldforwardclienttoserver,
  shouldforwardservertoclient,
  shouldnotforwardonpeerserver,
} from 'zss/device/forward'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { createinfohash } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'

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
  write(SOFTWARE, registerreadplayer(), `remote connected ${peer.id}`)
  routingtable.add({ id: peerstringtobytes(peer.id), peer })
})

finder.on('peerclose', (peer) => {
  write(SOFTWARE, registerreadplayer(), `remote closed ${peer.id}`)
  routingtable.remove(peerstringtobytes(peer.id))
})

// general routing info
let subscribetopic = ''
const subscribelastseen = new Map<string, Map<string, number>>()
finder.on('msg', (_, msg: ROUTING_MESSAGE) => {
  // grab timestamp
  const current = Date.now()
  // ensure we have a list of last seen peer for given topic
  const lastseen = subscribelastseen.get(msg.topic) ?? new Map<string, number>()

  // handle message
  if ('pub' in msg) {
    // are we subscribed to this topic ?
    if (msg.topic === subscribetopic) {
      // console.info('pub', msg.gme)
      topicbridge?.forward({
        ...msg.gme,
        // translate to software session
        session: SOFTWARE.session(),
      })
    }
    // peers that care about this topic
    for (const [peerid, delay] of lastseen) {
      const delta = current - delay
      // filter out peers that no longer care about given topic
      if (delta > 1000 * 60) {
        lastseen.delete(peerid)
      } else {
        // forward message to peer
        const [node] = routingtable.listClosestToId(
          peerstringtobytes(peerid),
          1,
        )
        if (ispresent(node)) {
          finder.send(node.peer, msg).catch(console.error)
        }
      }
    }
  } else if ('sub' in msg) {
    // track that this peer cares about this topic
    lastseen.set(msg.sub, current)
    // are we the host of this topic ?
    if (msg.topic === subscribetopic && finder._peerId === subscribetopic) {
      // console.info('sub', msg.gme)
      topicbridge?.forward({
        ...msg.gme,
        // translate to software session
        session: SOFTWARE.session(),
      })
    } else if (ispresent(msg.gme)) {
      // forwards towards host peer
      peersubscribemessage(msg.topic, msg.sub, msg.gme)
    }
  }
  // update last seen for given topic
  subscribelastseen.set(msg.topic, lastseen)
})

finder.on('trackerconnect', (tracker, stats) => {
  write(
    SOFTWARE,
    registerreadplayer(),
    `looking for players ${createinfohash(tracker.announceUrl)} [${stats.connected}]`,
  )
})
// finder.on('trackerwarning', console.info)

// topic related state
let isstarted = false
let topicbridge: MAYBE<ReturnType<typeof createforward>>
function peerusehost(host: string) {
  if (!isstarted) {
    isstarted = true
    subscribetopic = host
    finder.start()
    write(SOFTWARE, registerreadplayer(), `connecting to hubworld for ${host}`)
  }
}

function peerpublishmessage(topic: string, gme: MESSAGE) {
  // forwards towards topic host peer
  const [node] = routingtable.listClosestToId(peerstringtobytes(topic), 1)
  if (ispresent(node)) {
    finder.send(node.peer, { topic, pub: true, gme }).catch(console.error)
  }
}

export function peerserver(hidden: boolean, tabopen: boolean) {
  // get topic
  const host = finder._peerId

  // setup host
  peerusehost(host)
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

function peersubscribe(topic: string, player: string) {
  // forwards towards topic host peer
  peersubscribemessage(
    topic,
    finder._peerId,
    createmessage(
      SOFTWARE.session(),
      player,
      SOFTWARE.id(),
      `vm:joinack`,
      topic,
    ),
  )
  // not sure how slow of a poll this should be
  setTimeout(() => peersubscribe(topic, player), 1000 * 3)
}

export function peerclient(host: string, player: string) {
  peerusehost(host)
  peersubscribe(host, player)

  // open bridge between peers
  topicbridge = createforward((message) => {
    if (shouldforwardclienttoserver(message)) {
      peersubscribemessage(host, finder._peerId, message)
    }
  })
}

export function peerleave() {
  // close bridge between peers
  topicbridge?.disconnect()
  topicbridge = undefined
}
