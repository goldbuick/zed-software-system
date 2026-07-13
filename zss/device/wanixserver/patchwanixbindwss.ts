/**
 * CDN wanix@0.4.0-alpha8 wanix-bind type=import only loads an iframe
 * (MessagePort exchange). It never opens ws:// / wss:// — that path exists in
 * submodule elements/bind.js but is not in the published dist yet.
 * Patch connectedCallback so WSS remotes actually dial the 9P server.
 *
 * IMPORTANT (Go wasm): never fully settle bind.import *before* wanix.wasm
 * calls AwaitErr(...Get("import")). Awaiting an already-resolved Promise from
 * Go parks the goroutine waiting on a microtask that may never run →
 * wanix-system ready timeout. Dial early, but resolve asynchronously (setTimeout 0)
 * and do not await open before appendChild + waitsystemready.
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
      // No transfer list — match jsutil.PortReadWriter (reuse-safe clone).
      port1.postMessage(buf)
      return
    }
    if (event.data instanceof Blob) {
      void event.data.arrayBuffer().then((arr) => {
        port1.postMessage(new Uint8Array(arr))
      })
      return
    }
    if (ArrayBuffer.isView(event.data)) {
      const view = event.data as ArrayBufferView
      const copy = new Uint8Array(view.byteLength)
      copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
      port1.postMessage(copy)
      return
    }
    console.warn('wanix remote: unsupported websocket data', event.data)
  }
  ws.onclose = () => port1.close()

  port1.onmessage = (event) => {
    const data = event.data
    if (
      data instanceof ArrayBuffer ||
      ArrayBuffer.isView(data) ||
      typeof data === 'string'
    ) {
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

/**
 * Open a wanix-compatible MessagePort bridge over a remote 9P WebSocket.
 * Resolution is deferred by a macrotask so Go wasm AwaitErr can register
 * .then before the fulfill runs (avoids settled-promise park deadlock).
 */
export function openwssimport(src: string): Promise<MessagePort> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(src)
    let settled = false
    ws.onopen = () => {
      wanixperfmark('remote-wss-socket-open', { url: src })
      const port = websockettomessageport(ws)
      // Macrotask yield: Go AwaitErr must Call("then") before we fulfill.
      setTimeout(() => {
        if (settled) {
          return
        }
        settled = true
        wanixperfmark('remote-wss-open', { url: src })
        resolve(port)
      }, 0)
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
      // Prefer an import already started by preparewssremoteimports.
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
