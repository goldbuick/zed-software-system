import Peer, { MediaConnection } from 'peerjs'
import { getContext, connect, Volume } from 'tone'
import { api_error } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { getvocoder } from './synthvocoder'

// track our peer
let peer: MAYBE<Peer>

// track our active media streams
// media id + MediaStream
let activeusermedia: MAYBE<MediaStream>
let activeuservoice: MAYBE<MediaStream>

const activepeers: Record<string, boolean> = {}
const activepeervoice: Record<string, Volume> = {}
const activepeervoicecom: Record<string, MediaConnection> = {}

function setupuservoice(mediastream: MediaStream, addfx = false): MediaStream {
  // pipe media to speakers
  const node = getContext().createMediaStreamSource(mediastream)
  const uservoiceinput = new Volume()
  connect(node, uservoiceinput)

  const dest = getContext().createMediaStreamDestination()
  if (addfx) {
    getvocoder(uservoiceinput, 110, 'sine', 'brown').connect(dest)
  } else {
    uservoiceinput.connect(dest)
  }

  return dest.stream
}

export function usermediastart() {
  if (!ispresent(peer)) {
    peer = new Peer(registerreadplayer())
    peer.on('call', (mediaconnection) => {
      mediaconnection.on('stream', (mediastream) => {
        // TODO, add metadata to save audio vs video

        // pipe media to speakers
        const node = getContext().createMediaStreamSource(mediastream)
        const uservoiceinput = new Volume()
        connect(node, uservoiceinput)

        // track
        activepeervoice[mediaconnection.peer] = uservoiceinput
      })
      mediaconnection.on('close', () => {
        activepeervoice[mediaconnection.peer].dispose()
        delete activepeervoice[mediaconnection.peer]
      })
    })
  }
}

export function usermediastop() {
  if (ispresent(peer)) {
    peer.destroy()
    peer = undefined
  }
}

// voice
async function getuservoice(): Promise<MAYBE<MediaStream>> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
  } catch (err: any) {
    api_error(SOFTWARE, registerreadplayer(), 'uservoice', err.toString())
  }
  return undefined
}

export function uservoicestart(player: string) {
  usermediastart()
  getuservoice()
    .then((mediastream) => {
      if (ispresent(mediastream)) {
        activeuservoice = setupuservoice(mediastream, true)
        peerupdate(player)
      }
    })
    .catch((err) => {
      api_error(SOFTWARE, registerreadplayer(), 'uservoice', err.toString())
    })
}

export function uservoicestop() {
  //
}

// screenshare
async function getuserscreenshare(): Promise<MAYBE<MediaStream>> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    })
  } catch (err: any) {
    api_error(SOFTWARE, registerreadplayer(), 'userscreenshare', err.toString())
  }
  return undefined
}

export function userscreenstart(player: string) {
  usermediastart()
  getuserscreenshare()
    .then((mediastream) => {
      if (ispresent(mediastream)) {
        activeusermedia = mediastream
        peerupdate(player)
      }
    })
    .catch((err) => {
      api_error(SOFTWARE, registerreadplayer(), 'userscreen', err.toString())
    })
}

export function userscreenstop() {
  //
}

function peerstart(remote: string) {
  usermediastart()
  if (!ispresent(peer)) {
    return
  }
  activepeers[remote] = true
}

function peerstop(remote: string) {
  if (!ispresent(peer)) {
    return
  }
  delete activepeers[remote]
}

function peerupdate(player: string) {
  if (!ispresent(peer)) {
    return
  }
  const ids = Object.keys(activepeers)

  // process voice
  if (ispresent(activeuservoice)) {
    // validate peer state
    for (let i = 0; i < ids.length; ++i) {
      // are we connected ?
      const id = ids[i]
      if (id !== player && !ispresent(activepeervoicecom[id])) {
        activepeervoicecom[id] = peer.call(id, activeuservoice)
      }
    }
  }
}

// update connected peers
export function usermediawritepeers(peers: string[]) {
  const newids: Record<string, boolean> = {}
  // check to see if we've added an id
  for (let i = 0; i < peers.length; ++i) {
    const id = peers[i]
    if (!ispresent(activepeers[id])) {
      newids[id] = true
      peerstart(id)
    }
  }

  // check to see if we've dropped an id
  const ids = Object.keys(activepeers)
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    if (!ispresent(newids[id])) {
      // stop peer
      peerstop(id)
    }
  }

  peerupdate(registerreadplayer())
}
