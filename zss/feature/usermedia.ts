import Peer, { MediaConnection } from 'peerjs'
import { getContext, connect, Mono } from 'tone'
import { api_error } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { getvocoder } from './synthvocoder'

// track our peer
let peer: MAYBE<Peer>

// track our active media streams
// media id + MediaStream
const activemedia: Record<string, MediaStream> = {}

// track our active peers - peerid + their media connections
const activepeers: Record<string, MediaConnection> = {}

const activepeervoice: Record<string, MediaStream> = {}

function setupuservoice(mediastream: MediaStream, addfx = false) {
  // pipe media to speakers
  const node = getContext().createMediaStreamSource(mediastream)
  const uservoiceinput = new Mono()
  connect(node, uservoiceinput)
  return addfx ? getvocoder(uservoiceinput) : uservoiceinput
}

export function usermediastart() {
  if (!ispresent(peer)) {
    peer = new Peer(registerreadplayer())
    peer.on('call', (mediaconnection) => {
      mediaconnection.on('stream', (mediastream) => {
        activepeervoice[mediaconnection.peer] = mediastream
        // add to media texture ->
      })
      mediaconnection.on('close', () => {
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

export function uservoicestart() {
  usermediastart()
  getuservoice()
    .then((mediastream) => {
      if (ispresent(mediastream)) {
        activemedia[mediastream.id] = mediastream
        // todo see if we have to call existing peers with this media stream
        setupuservoice(mediastream, true)
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

export function userscreenstart() {
  usermediastart()
  getuserscreenshare()
    .then((mediastream) => {
      if (ispresent(mediastream)) {
        activemedia[mediastream.id] = mediastream
        // todo see if we have to call existing peers with this media stream
        setupuservoice(mediastream)
      }
    })
    .catch((err) => {
      api_error(SOFTWARE, registerreadplayer(), 'userscreen', err.toString())
    })
}

export function userscreenstop() {
  //
}

function peerstart(player: string) {
  usermediastart()
  if (!ispresent(peer)) {
    return
  }
  const mediastreams = Object.values(activemedia)
  for (let i = 0; i < mediastreams.length; ++i) {
    peer.call(player, mediastreams[i], {})
  }
}

function peerstop(player: string) {
  const mediaconnection = activepeers[player]
  if (ispresent(mediaconnection)) {
    mediaconnection.close()
  }
}

// update connected peers
export function usermediawritepeers(peers: string[]) {
  const newids: Record<string, boolean> = {}
  // check to see if we've added an id
  for (let i = 0; i < peers.length; ++i) {
    const id = peers[i]
    // skip us
    if (id !== registerreadplayer() && !ispresent(activepeers[id])) {
      newids[id] = true
      // start peer
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
}
