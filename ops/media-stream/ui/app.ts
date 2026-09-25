import Peer, { type DataConnection, type MediaConnection } from 'peerjs'

import type { MS_DESTINATIONS_DISK } from '../src/shared/destinations'

import { createaudiobuses } from './audiobuses'
import {
  createcompositor,
  hcanvasheight,
  hcanvaswidth,
  verticalcropwidth,
} from './compositor'
import { mspeerserveroptions } from './peerserver'
import {
  type MEDIASTREAM_MESSAGE,
  MEDIASTREAM_PROTOCOL,
  ismediastreammessage,
} from './protocol'

const localpeerel = document.getElementById('localpeer') as HTMLInputElement
const copypeerel = document.getElementById('copypeer') as HTMLButtonElement
const cafestatusel = document.getElementById('cafestatus') as HTMLDivElement
const destlistel = document.getElementById('destlist') as HTMLDivElement
const enhancedel = document.getElementById('enhanced') as HTMLInputElement
const dualformatel = document.getElementById('dualformat') as HTMLInputElement
const hpreviewel = document.getElementById('hpreview') as HTMLCanvasElement
const vpreviewel = document.getElementById('vpreview') as HTMLCanvasElement
const cropframeel = document.getElementById('cropframe') as HTMLDivElement
const previewwrapel = document.querySelector('.previewwrap') as HTMLDivElement
const gostartel = document.getElementById('gostart') as HTMLButtonElement
const gostopel = document.getElementById('gostop') as HTMLButtonElement
const statusel = document.getElementById('status') as HTMLDivElement

const workh = document.createElement('canvas')
const workv = document.createElement('canvas')
const compositor = createcompositor(workh, workv)
const audiobuses = createaudiobuses()

let peer: Peer | null = null
let cafeconn: DataConnection | null = null
let mediacall: MediaConnection | null = null
let disk: MS_DESTINATIONS_DISK | null = null
let streaming = false
let frameTimer: ReturnType<typeof setInterval> | null = null
let videoel: HTMLVideoElement | null = null

function setstatus(text: string) {
  statusel.textContent = text
}

function setcafestatus(text: string) {
  cafestatusel.textContent = text
}

function sendtocafe(message: MEDIASTREAM_MESSAGE) {
  if (cafeconn && cafeconn.open) {
    void cafeconn.send(message)
  }
}

function updatecropframe() {
  const previeww = previewwrapel.clientWidth || 320
  const full = hcanvaswidth()
  const cropw = verticalcropwidth()
  const maxx = Math.max(0, full - cropw)
  const sx = compositor.cropoffsetx * maxx
  const framew = (cropw / full) * previeww
  const left = (sx / full) * previeww
  cropframeel.style.width = `${framew}px`
  cropframeel.style.left = `${left}px`
}

function persistencode() {
  if (!disk) {
    return
  }
  disk.encode.enhanced = enhancedel.checked
  disk.encode.dualformat = dualformatel.checked
  disk.encode.cropoffsetx = compositor.cropoffsetx
  void window.ms.core.invoke('write_destinations', { disk })
}

function renderdestlist() {
  if (!disk) {
    return
  }
  destlistel.innerHTML = ''
  for (const dest of disk.destinations) {
    const row = document.createElement('div')
    row.className = 'destrow'
    const enable = document.createElement('label')
    const check = document.createElement('input')
    check.type = 'checkbox'
    check.checked = dest.enabled
    check.addEventListener('change', () => {
      dest.enabled = check.checked
      void window.ms.core.invoke('write_destinations', { disk: disk! })
    })
    enable.append(
      check,
      document.createTextNode(` ${dest.label} (${dest.kind})`),
    )
    row.appendChild(enable)

    if (dest.kind !== 'twitch') {
      const urllabel = document.createElement('label')
      urllabel.textContent = 'rtmp url'
      const url = document.createElement('input')
      url.type = 'text'
      url.value = dest.rtmpurl
      url.spellcheck = false
      url.addEventListener('change', () => {
        dest.rtmpurl = url.value.trim()
        void window.ms.core.invoke('write_destinations', { disk: disk! })
      })
      row.append(urllabel, url)
    }

    const keylabel = document.createElement('label')
    keylabel.textContent = 'stream key'
    const key = document.createElement('input')
    key.type = 'password'
    key.value = dest.streamkey
    key.spellcheck = false
    key.autocomplete = 'off'
    key.addEventListener('change', () => {
      dest.streamkey = key.value.trim()
      void window.ms.core.invoke('write_destinations', { disk: disk! })
    })
    row.append(keylabel, key)
    destlistel.appendChild(row)
  }
}

function drawpreview() {
  const hctx = hpreviewel.getContext('2d')
  const vctx = vpreviewel.getContext('2d')
  if (!hctx || !vctx) {
    return
  }
  if (videoel && videoel.readyState >= 2) {
    compositor.draw(
      videoel,
      videoel.videoWidth || 1280,
      videoel.videoHeight || 720,
    )
  } else {
    compositor.draw(workh, hcanvaswidth(), hcanvasheight())
  }
  hctx.drawImage(workh, 0, 0, hpreviewel.width, hpreviewel.height)
  vctx.drawImage(workv, 0, 0, vpreviewel.width, vpreviewel.height)
  updatecropframe()
}

function stopframelook() {
  if (frameTimer) {
    clearInterval(frameTimer)
    frameTimer = null
  }
}

function startframelook() {
  stopframelook()
  frameTimer = setInterval(() => {
    drawpreview()
    if (!streaming) {
      return
    }
    const image = compositor.readhrgba()
    void window.msframe.write({
      rgba: image.data.buffer.slice(
        image.data.byteOffset,
        image.data.byteOffset + image.data.byteLength,
      ),
      width: image.width,
      height: image.height,
    })
  }, 1000 / 15)
}

function wiremediacall(call: MediaConnection) {
  if (mediacall && mediacall !== call) {
    try {
      mediacall.close()
    } catch {
      // ignore
    }
  }
  mediacall = call
  call.on('stream', (stream) => {
    if (!videoel) {
      videoel = document.createElement('video')
      videoel.muted = true
      videoel.playsInline = true
      videoel.autoplay = true
    }
    videoel.srcObject = stream
    void videoel.play().catch(() => undefined)
    // Heuristic: first audio track = synth+mix from cafe; board-TV may be separate later
    audiobuses.setsynth(stream)
    setstatus('receiving cafe capture')
  })
  call.on('close', () => {
    if (mediacall === call) {
      mediacall = null
    }
  })
}

function wiredataconnection(conn: DataConnection) {
  cafeconn = conn
  setcafestatus(`cafe: connected (${conn.peer})`)
  conn.on('data', (raw) => {
    if (!ismediastreammessage(raw)) {
      return
    }
    if (raw.type === 'mediastream:hello' && raw.role === 'cafe') {
      sendtocafe({
        type: 'mediastream:hello',
        protocol: MEDIASTREAM_PROTOCOL,
        role: 'companion',
        peerid: peer?.id || '',
      })
      sendtocafe({
        type: 'mediastream:bindack',
        ok: true,
        peerid: peer?.id || '',
      })
    }
    if (raw.type === 'mediastream:stop') {
      void stopstreaming()
    }
  })
  conn.on('close', () => {
    if (cafeconn === conn) {
      cafeconn = null
      setcafestatus('cafe: unbound')
    }
  })
  conn.on('open', () => {
    sendtocafe({
      type: 'mediastream:hello',
      protocol: MEDIASTREAM_PROTOCOL,
      role: 'companion',
      peerid: peer?.id || '',
    })
  })
}

async function startstreaming() {
  persistencode()
  const result = await window.ms.core.invoke('start_egress', {})
  if (!result.ok) {
    setstatus(result.error || 'start failed')
    return
  }
  streaming = true
  gostartel.disabled = true
  gostopel.disabled = false
  setstatus('streaming')
  sendtocafe({ type: 'mediastream:golive' })
  sendtocafe({
    type: 'mediastream:status',
    status: 'streaming',
    streaming: true,
    destinations: (disk?.destinations || [])
      .filter((d) => d.enabled)
      .map((d) => ({
        id: d.id,
        label: d.label,
        enabled: true,
        live: true,
      })),
  })
}

async function stopstreaming() {
  streaming = false
  await window.ms.core.invoke('stop_egress', {})
  gostartel.disabled = false
  gostopel.disabled = true
  setstatus('stopped')
  sendtocafe({ type: 'mediastream:stop' })
  sendtocafe({
    type: 'mediastream:status',
    status: 'stopped',
    streaming: false,
  })
}

function bindcropdrag() {
  let dragging = false
  previewwrapel.addEventListener('pointerdown', (ev) => {
    dragging = true
    previewwrapel.setPointerCapture(ev.pointerId)
    movecrop(ev.clientX)
  })
  previewwrapel.addEventListener('pointermove', (ev) => {
    if (!dragging) {
      return
    }
    movecrop(ev.clientX)
  })
  previewwrapel.addEventListener('pointerup', () => {
    dragging = false
    persistencode()
  })
  previewwrapel.addEventListener('pointercancel', () => {
    dragging = false
  })
}

function movecrop(clientx: number) {
  const rect = previewwrapel.getBoundingClientRect()
  const x = clientx - rect.left
  const previeww = rect.width || 1
  const full = hcanvaswidth()
  const cropw = verticalcropwidth()
  const maxx = Math.max(0, full - cropw)
  const centerx = (x / previeww) * full
  const sx = Math.min(maxx, Math.max(0, centerx - cropw / 2))
  compositor.cropoffsetx = maxx > 0 ? sx / maxx : 0.5
  updatecropframe()
}

async function boot() {
  disk = await window.ms.core.invoke('read_destinations', {})
  compositor.cropoffsetx = disk.encode.cropoffsetx
  enhancedel.checked = disk.encode.enhanced
  dualformatel.checked = disk.encode.dualformat
  renderdestlist()
  updatecropframe()
  bindcropdrag()
  enhancedel.addEventListener('change', persistencode)
  dualformatel.addEventListener('change', persistencode)
  gostartel.addEventListener('click', () => {
    void startstreaming()
  })
  gostopel.addEventListener('click', () => {
    void stopstreaming()
  })

  const resolved = await window.ms.core.invoke('resolve_ms_peer_id', {})
  localpeerel.value = resolved.peerid
  copypeerel.disabled = false
  copypeerel.addEventListener('click', () => {
    void window.ms.core.invoke('copy_text', {
      text: `#broadcast stream ${resolved.peerid}`,
    })
    setstatus('copied bind command')
  })

  const opts = mspeerserveroptions({ debug: 1 })
  peer = new Peer(resolved.peerid, opts)
  peer.on('open', (id) => {
    localpeerel.value = id
    setstatus('peer open')
  })
  peer.on('connection', wiredataconnection)
  peer.on('call', (call) => {
    call.answer()
    wiremediacall(call)
  })
  peer.on('error', (err) => {
    setstatus(`peer error: ${err.type || err.message}`)
  })
  peer.on('disconnected', () => {
    peer?.reconnect()
  })

  void window.ms.event.listen('ms_status', (msg) => {
    const payload = msg.payload as { status?: string }
    if (payload.status) {
      setstatus(payload.status)
    }
  })
  void window.ms.event.listen('ms_dest_error', (msg) => {
    const payload = msg.payload as { id?: string; error?: string }
    setstatus(`${payload.id || 'dest'}: ${payload.error || 'error'}`)
  })

  startframelook()
}

void boot()
