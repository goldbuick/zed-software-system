/**
 * Main-thread session list service. The first tab to claim the book token as a
 * PeerJS id runs the list; every other tab connects to it as a client.
 */
import Peer, { DataConnection } from 'peerjs'
import { apierror, apilog, vmsessionlist } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  netterminalregisterrosterchangehandler,
  readpeerroster,
} from 'zss/feature/netterminal'
import { peerserveroptions } from 'zss/feature/peerserver'
import { PEER_ID_RE } from 'zss/feature/url'
import { MAYBE, ispresent } from 'zss/mapping/types'

import {
  SESSIONLIST_ENTRY,
  SESSIONLIST_MESSAGE,
  issessionlistmessage,
  issessionlistpeerid,
} from './protocol'
import {
  SESSIONLIST_HEARTBEAT_MS,
  createsessionlistregistry,
  sessionlistexpire,
  sessionlistremovebyconnection,
  sessionlistsnapshot,
  sessionlistupsert,
} from './registry'

const SESSIONLIST_MAX_CLIENTS = 64
const SESSIONLIST_STEP_TIMEOUT_MS = 20_000
const SESSIONLIST_RETRY_JITTER_MS = 3_000
const SESSIONLIST_RETRY_BASE_MS = 1_000
const SESSIONLIST_RETRY_MAX_MS = 60_000
const SESSIONLIST_RETRY_LIMIT = 8
const SESSIONLIST_SELF_KEY = 'self'

type SESSIONLIST_ROLE = 'idle' | 'claiming' | 'lister' | 'client'

let token = ''
let role: SESSIONLIST_ROLE = 'idle'
let serial = 0
let retryattempt = 0
let peer: MAYBE<Peer>
let listerconnection: MAYBE<DataConnection>
let steptimer: MAYBE<ReturnType<typeof setTimeout>>
let retrytimer: MAYBE<ReturnType<typeof setTimeout>>
let heartbeattimer: MAYBE<ReturnType<typeof setInterval>>
let hostingtopic = ''
let hostingplayers = 0
let rosterhooked = false
let unloadhooked = false
let sessions: SESSIONLIST_ENTRY[] = []

const registry = createsessionlistregistry()
const clients = new Map<string, DataConnection>()

function player() {
  return registerreadplayer()
}

function pushsim() {
  const rows = sessions
    .filter((entry) => entry.topic !== hostingtopic)
    .map((entry) => ({ topic: entry.topic, players: entry.players }))
  vmsessionlist(SOFTWARE, player(), rows)
}

function clearsteptimer() {
  if (ispresent(steptimer)) {
    clearTimeout(steptimer)
    steptimer = undefined
  }
}

function clearretrytimer() {
  if (ispresent(retrytimer)) {
    clearTimeout(retrytimer)
    retrytimer = undefined
  }
}

function clearheartbeat() {
  if (ispresent(heartbeattimer)) {
    clearInterval(heartbeattimer)
    heartbeattimer = undefined
  }
}

function teardownpeer() {
  clearsteptimer()
  listerconnection?.close()
  listerconnection = undefined
  for (const conn of clients.values()) {
    conn.close()
  }
  clients.clear()
  registry.clear()
  peer?.destroy()
  peer = undefined
  sessions = []
}

function hookunload() {
  if (unloadhooked) {
    return
  }
  unloadhooked = true
  window.addEventListener('unload', () => {
    peer?.destroy()
    peer = undefined
  })
}

function send(conn: DataConnection, message: SESSIONLIST_MESSAGE) {
  if (conn.open) {
    void conn.send(message)
  }
}

function registermessage(): SESSIONLIST_MESSAGE {
  return {
    type: 'sessionlist:register',
    topic: hostingtopic,
    players: hostingplayers,
  }
}

function listerpublish() {
  sessions = sessionlistsnapshot(registry)
  const list: SESSIONLIST_MESSAGE = { type: 'sessionlist:list', sessions }
  for (const conn of clients.values()) {
    send(conn, list)
  }
  pushsim()
}

function listerupsertself() {
  if (hostingtopic) {
    sessionlistupsert(
      registry,
      SESSIONLIST_SELF_KEY,
      hostingtopic,
      hostingplayers,
      Date.now(),
    )
  }
}

function heartbeat() {
  switch (role) {
    case 'lister':
      listerupsertself()
      sessionlistexpire(registry, Date.now())
      listerpublish()
      break
    case 'client':
      if (hostingtopic && ispresent(listerconnection)) {
        send(listerconnection, registermessage())
      }
      break
    default:
      break
  }
}

function startheartbeat() {
  clearheartbeat()
  heartbeattimer = setInterval(heartbeat, SESSIONLIST_HEARTBEAT_MS)
}

function scheduleretry(reason: string) {
  const current = ++serial
  teardownpeer()
  clearheartbeat()
  role = 'idle'
  pushsim()
  if (retryattempt >= SESSIONLIST_RETRY_LIMIT) {
    apierror(
      SOFTWARE,
      player(),
      'session list',
      `gave up after ${retryattempt} attempts (${reason})`,
    )
    return
  }
  const backoff =
    retryattempt === 0
      ? 0
      : Math.min(
          SESSIONLIST_RETRY_MAX_MS,
          SESSIONLIST_RETRY_BASE_MS * 2 ** (retryattempt - 1),
        )
  const delay =
    backoff + Math.floor(Math.random() * SESSIONLIST_RETRY_JITTER_MS)
  retryattempt += 1
  clearretrytimer()
  retrytimer = setTimeout(() => {
    retrytimer = undefined
    if (current === serial) {
      claim()
    }
  }, delay)
}

function acceptclient(conn: DataConnection, current: number) {
  const key = conn.connectionId
  if (clients.size >= SESSIONLIST_MAX_CLIENTS) {
    apilog(
      SOFTWARE,
      player(),
      `session list: client cap ${SESSIONLIST_MAX_CLIENTS} reached; refusing ${conn.peer}`,
    )
    conn.on('open', () => conn.close())
    return
  }
  clients.set(key, conn)
  conn.on('open', () => {
    if (current === serial) {
      send(conn, { type: 'sessionlist:list', sessions })
    }
  })
  conn.on('data', (data: unknown) => {
    if (current !== serial || !issessionlistmessage(data)) {
      return
    }
    switch (data.type) {
      case 'sessionlist:register':
        if (!PEER_ID_RE.test(data.topic)) {
          return
        }
        sessionlistupsert(
          registry,
          key,
          data.topic,
          Math.max(0, Math.floor(data.players)),
          Date.now(),
        )
        listerpublish()
        break
      case 'sessionlist:unregister':
        if (sessionlistremovebyconnection(registry, key)) {
          listerpublish()
        }
        break
      case 'sessionlist:query':
        send(conn, { type: 'sessionlist:list', sessions })
        break
      default:
        break
    }
  })
  conn.on('close', () => {
    if (current !== serial) {
      return
    }
    clients.delete(key)
    if (sessionlistremovebyconnection(registry, key)) {
      listerpublish()
    }
  })
  conn.on('error', (err) => {
    apilog(SOFTWARE, player(), `session list: client ${conn.peer} ${err.type}`)
  })
}

function connectclient() {
  const current = ++serial
  teardownpeer()
  role = 'client'
  const client = new Peer(peerserveroptions())
  peer = client
  steptimer = setTimeout(() => {
    steptimer = undefined
    if (current !== serial) {
      return
    }
    apierror(SOFTWARE, player(), 'session list', 'connect timed out')
    scheduleretry('connect timeout')
  }, SESSIONLIST_STEP_TIMEOUT_MS)

  client.on('open', () => {
    if (current !== serial) {
      return
    }
    const conn = client.connect(token, { reliable: true })
    listerconnection = conn
    conn.on('open', () => {
      if (current !== serial) {
        return
      }
      clearsteptimer()
      retryattempt = 0
      apilog(SOFTWARE, player(), 'session list: connected')
      send(conn, { type: 'sessionlist:query' })
      if (hostingtopic) {
        send(conn, registermessage())
      }
      startheartbeat()
    })
    conn.on('data', (data: unknown) => {
      if (current !== serial || !issessionlistmessage(data)) {
        return
      }
      if (data.type === 'sessionlist:list') {
        sessions = data.sessions
        pushsim()
      }
    })
    conn.on('close', () => {
      if (current !== serial) {
        return
      }
      listerconnection = undefined
      apilog(SOFTWARE, player(), 'session list: lister left')
      scheduleretry('lister closed')
    })
    conn.on('error', (err) => {
      if (current !== serial) {
        return
      }
      apierror(SOFTWARE, player(), 'session list', `lister link ${err.type}`)
    })
  })

  client.on('error', (err) => {
    if (current !== serial) {
      return
    }
    apierror(SOFTWARE, player(), 'session list', `client ${err.type}`)
    scheduleretry(err.type)
  })
}

function claim() {
  const current = ++serial
  teardownpeer()
  role = 'claiming'
  hookunload()
  const candidate = new Peer(token, peerserveroptions())
  peer = candidate
  steptimer = setTimeout(() => {
    steptimer = undefined
    if (current !== serial) {
      return
    }
    apierror(SOFTWARE, player(), 'session list', 'claim timed out')
    scheduleretry('claim timeout')
  }, SESSIONLIST_STEP_TIMEOUT_MS)

  candidate.on('open', () => {
    if (current !== serial) {
      return
    }
    clearsteptimer()
    retryattempt = 0
    role = 'lister'
    apilog(SOFTWARE, player(), 'session list: hosting')
    listerupsertself()
    listerpublish()
    startheartbeat()
  })

  candidate.on('connection', (conn) => {
    if (current === serial && role === 'lister') {
      acceptclient(conn, current)
    } else {
      conn.close()
    }
  })

  candidate.on('disconnected', () => {
    if (current !== serial) {
      return
    }
    apierror(SOFTWARE, player(), 'session list', 'lost signaling')
    scheduleretry('signaling lost')
  })

  candidate.on('error', (err) => {
    if (current !== serial) {
      return
    }
    if (err.type === 'unavailable-id' && role === 'claiming') {
      connectclient()
      return
    }
    apierror(SOFTWARE, player(), 'session list', `lister ${err.type}`)
    scheduleretry(err.type)
  })
}

function hookroster() {
  if (rosterhooked) {
    return
  }
  rosterhooked = true
  netterminalregisterrosterchangehandler(() => {
    if (hostingtopic) {
      sessionlistsethosting(hostingtopic)
    }
  })
}

/** Move to the list for `next` (the main book token). */
export function sessionlistsettoken(next: string) {
  if (next === token || !issessionlistpeerid(next)) {
    return
  }
  token = next
  retryattempt = 0
  clearretrytimer()
  clearheartbeat()
  claim()
}

/** List this tab's multiplayer session; player count comes from the peer roster. */
export function sessionlistsethosting(topic: string) {
  hookroster()
  hostingtopic = topic
  hostingplayers = Math.max(1, readpeerroster().length)
  switch (role) {
    case 'lister':
      listerupsertself()
      listerpublish()
      break
    case 'client':
      if (ispresent(listerconnection)) {
        send(listerconnection, registermessage())
      }
      pushsim()
      break
    default:
      pushsim()
      break
  }
}

/** Stop browsing and listing (soft join into another session). */
export function sessionlisthalt() {
  ++serial
  clearretrytimer()
  clearheartbeat()
  teardownpeer()
  token = ''
  role = 'idle'
  retryattempt = 0
  hostingtopic = ''
  hostingplayers = 0
  pushsim()
}
