import Peer, { MediaConnection } from 'peerjs'
import { getContext, connect, Gain } from 'tone'
import { api_error } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useMedia } from 'zss/gadget/hooks'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { getvocoder } from './synthvocoder'

// track our peer
let peer: MAYBE<Peer>

// track our active media streams
// media id + MediaStream
let activeuservoice: MAYBE<MediaStream>
let activeuserscreen: MAYBE<MediaStream>

const activepeers: Record<string, boolean> = {}
const activepeervoicecom: Record<string, MediaConnection> = {}
const activepeervoicenode: Record<string, Gain> = {}

const activepeerscreencom: Record<string, MediaConnection> = {}
const activepeersscreenelement: Record<string, HTMLVideoElement> = {}

function setupuservoice(peer: string, mediastream: MediaStream, addfx = false) {
  // connect to tone.js
  const node = getContext().createMediaStreamSource(mediastream)
  const voicenode = new Gain(5)
  connect(node, voicenode)

  if (peer === registerreadplayer()) {
    console.info('setup local voice', peer)
    activeuservoice = mediastream
    // const dest = getContext().createMediaStreamDestination()
    // if (addfx) {
    //   getvocoder(voicenode, 110, 'sine', 'brown').connect(dest)
    // } else {
    //   voicenode.connect(dest)
    // }
    // activeuservoice = dest.stream
  } else {
    console.info('setup remote voice', peer)
    voicenode.toDestination()
  }

  activepeervoicenode[peer] = voicenode
}

function setupuserscreen(peer: string, mediastream: MediaStream) {
  const element = document.createElement('video')
  element.autoplay = true
  element.srcObject = mediastream

  if (peer === registerreadplayer()) {
    activeuserscreen = mediastream
  } else {
    console.info('setup remote screen', peer)
  }

  useMedia.getState().setscreen(peer, element)

  activepeersscreenelement[peer] = element
}

function haltusermedia(peer: string) {
  activepeervoicenode[peer]?.dispose()
  activepeervoicecom[peer]?.close()
  delete activepeervoicenode[peer]
  delete activepeervoicecom[peer]
  delete activepeerscreencom[peer]
  delete activepeersscreenelement[peer]
  // drop from media data hook
}

function handlemediaconnection(mediaconnection: MediaConnection) {
  console.info('mediaconnection.metadata', mediaconnection.metadata)
  mediaconnection.on('stream', (mediastream) => {
    if (mediaconnection.metadata.screen) {
      setupuserscreen(mediaconnection.peer, mediastream)
    } else {
      setupuservoice(mediaconnection.peer, mediastream)
    }
  })
  mediaconnection.on('close', () => {
    haltusermedia(mediaconnection.peer)
  })
  mediaconnection.on('error', () => {
    haltusermedia(mediaconnection.peer)
  })
}

export function usermediastart() {
  if (!ispresent(peer)) {
    peer = new Peer(registerreadplayer())
    peer.on('call', (mediaconnection) => {
      mediaconnection.answer()
      handlemediaconnection(mediaconnection)
      setTimeout(peerupdate, 1000)
    })
    peer.on('error', (err: Error) => {
      api_error(SOFTWARE, registerreadplayer(), 'usermedia', err.toString())
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
        echoCancellation: false,
        noiseSuppression: false,
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
        setupuservoice(registerreadplayer(), mediastream)
        peerupdate()
      }
    })
    .catch((err) => {
      api_error(SOFTWARE, registerreadplayer(), 'uservoice', err.toString())
    })
}

export function uservoicestop() {
  haltusermedia(registerreadplayer())
  activeuservoice = undefined
  if (!ispresent(activeuserscreen)) {
    usermediastop()
  }
}

// screenshare
async function getuserscreen(): Promise<MAYBE<MediaStream>> {
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
  getuserscreen()
    .then((mediastream) => {
      if (ispresent(mediastream)) {
        setupuserscreen(registerreadplayer(), mediastream)
        peerupdate()
      }
    })
    .catch((err) => {
      api_error(SOFTWARE, registerreadplayer(), 'userscreen', err.toString())
    })
}

export function userscreenstop() {
  activeuserscreen = undefined
  if (!ispresent(activeuservoice)) {
    usermediastop()
  }
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
  activepeervoicecom[remote]?.close()
  activepeervoicenode[remote]?.dispose()
  delete activepeers[remote]
  delete activepeervoicecom[remote]
  delete activepeervoicenode[remote]
}

function peerupdate() {
  if (!ispresent(peer)) {
    return
  }
  // get active ids
  const ids = Object.keys(activepeers)

  // process voice
  if (ispresent(activeuservoice)) {
    // validate peer state
    for (let i = 0; i < ids.length; ++i) {
      // are we connected ?
      const id = ids[i]
      if (id === registerreadplayer()) {
        continue
      }
      const check = activepeervoicecom[id]
      if (!ispresent(check) || !check.open) {
        const mediaconnection = peer.call(id, activeuservoice, {
          metadata: { voice: true },
        })
        activepeervoicecom[id] = mediaconnection
        handlemediaconnection(mediaconnection)
      }
    }
  }

  // process screen share
  if (ispresent(activeuserscreen)) {
    // validate peer state
    for (let i = 0; i < ids.length; ++i) {
      // are we connected ?
      const id = ids[i]
      if (id === registerreadplayer()) {
        continue
      }
      const check = activepeerscreencom[id]
      if (!ispresent(check) || !check.open) {
        const mediaconnection = peer.call(id, activeuserscreen, {
          metadata: { screen: true },
        })
        activepeerscreencom[id] = mediaconnection
        handlemediaconnection(mediaconnection)
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
      peerstop(id)
    }
  }

  peerupdate()
}
