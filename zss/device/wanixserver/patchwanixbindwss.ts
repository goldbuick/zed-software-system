/**
 * CDN wanix@0.4.0-alpha8 wanix-bind type=import only loads an iframe
 * (MessagePort exchange). It never opens ws:// / wss:// — that path exists in
 * submodule elements/bind.js but is not in the published dist yet.
 * Patch connectedCallback so WSS remotes actually dial the 9P server.
 */

import { wanixperfmark } from 'zss/feature/wanix/wanixperf'

type BindImportElement = HTMLElement & {
  import?: Promise<MessagePort>
  dst?: string | null
  src?: string | null
  type?: string | null
}

let patched = false

export function iswssremoteurl(src: string): boolean {
  const lower = src.toLowerCase()
  return lower.startsWith('ws://') || lower.startsWith('wss://')
}

function websockettomessageport(ws: WebSocket): MessagePort {
  const { port1, port2 } = new MessageChannel()
  ws.binaryType = 'arraybuffer'

  ws.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
      const buf = new Uint8Array(event.data)
      port1.postMessage(buf, [buf.buffer])
      return
    }
    if (event.data instanceof Blob) {
      void event.data.arrayBuffer().then((arr) => {
        const buf = new Uint8Array(arr)
        port1.postMessage(buf, [buf.buffer])
      })
      return
    }
    if (ArrayBuffer.isView(event.data)) {
      const view = event.data as ArrayBufferView
      const buf = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
      const copy = new Uint8Array(buf.byteLength)
      copy.set(buf)
      port1.postMessage(copy, [copy.buffer])
      return
    }
    console.warn('wanix remote: unsupported websocket data', event.data)
  }
  ws.onclose = () => port1.close()

  port1.onmessage = (event) => {
    const data = event.data
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data) || typeof data === 'string') {
      ws.send(data)
      return
    }
    console.warn('wanix remote: unsupported port data', data)
  }
  port1.onclose = () => {
    try {
      ws.close()
    } catch {
      // ignore
    }
  }

  return port2
}

/** Open a wanix-compatible MessagePort bridge over a remote 9P WebSocket. */
export function openwssimport(src: string): Promise<MessagePort> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(src)
    let settled = false
    ws.onopen = () => {
      settled = true
      wanixperfmark('remote-wss-open', { url: src })
      resolve(websockettomessageport(ws))
    }
    ws.onerror = () => {
      if (settled) {
        return
      }
      settled = true
      wanixperfmark('remote-wss-error', { url: src })
      reject(new Error(`wanix remote websocket failed: ${src}`))
    }
    ws.onclose = () => {
      if (settled) {
        return
      }
      settled = true
      wanixperfmark('remote-wss-closed', { url: src })
      reject(new Error(`wanix remote websocket closed before open: ${src}`))
    }
  })
}

/** Call once after CDN wanix custom elements are defined (wanix.html load order). */
export function patchwanixbindwss(): void {
  if (patched || typeof customElements === 'undefined') {
    return
  }
  const Bind = customElements.get('wanix-bind')
  if (!Bind) {
    return
  }
  const proto = Bind.prototype as BindImportElement & {
    connectedCallback?: () => void
  }
  const previous = proto.connectedCallback
  if (!previous) {
    return
  }
  proto.connectedCallback = function patchwanixbindwssconnected(
    this: BindImportElement,
  ) {
    const src = this.getAttribute('src') || ''
    const type = this.getAttribute('type') || 'ns'
    if (type === 'import' && iswssremoteurl(src)) {
      this.style.display = 'none'
      this.dst = this.getAttribute('dst')
      this.src = src
      this.type = type
      // Prefer an import already opened by preparewssremoteimports (before
      // append). Never fall through to CDN iframe import for wss://.
      if (!this.import) {
        wanixperfmark('remote-wss-dial', { url: src, dst: this.dst })
        this.import = openwssimport(src)
      }
      return
    }
    previous.call(this)
  }
  patched = true
  wanixperfmark('remote-wss-bind-patched')
}
