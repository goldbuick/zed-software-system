/**
 * CDN wanix@0.4.0-alpha8 wanix-bind type=import only loads an iframe
 * (MessagePort exchange). It never opens ws:// / wss:// — that path exists in
 * submodule elements/bind.js but is not in the published dist yet.
 * Patch connectedCallback so WSS remotes actually dial the 9P server.
 *
 * Go wasm AwaitErr parks forever if Call("then") hits an already-resolved
 * Promise. Assign a plain thenable as bind.import (so Call always hits our
 * then), forward to a gated native Promise, and only allowfulfill after
 * setupNamespace has had time to Call("then").
 */

import { wanixperfmark } from 'zss/feature/wanix/wanixperf'

type BindImportElement = HTMLElement & {
  import?: PromiseLike<MessagePort>
  dst?: string | null
  src?: string | null
  type?: string | null
}

export type GatedWssImport = {
  /** Plain thenable — assign this to bind.import (not the raw Promise). */
  thenable: PromiseLike<MessagePort>
  /** Underlying promise (for tests / await). */
  promise: Promise<MessagePort>
  dial: () => void
  allowfulfill: () => void
  /** Resolves once Go/JS has Call("then")'d the thenable. */
  waitforthen: (timeoutms?: number) => Promise<void>
  readthencount: () => number
}

let patched = false

/** Yield after AwaitErr Call("then") before allowfulfill. */
export const WSS_IMPORT_FULFILL_DELAY_MS = 16

export function iswssremoteurl(src: string): boolean {
  const lower = src.toLowerCase()
  return lower.startsWith('ws://') || lower.startsWith('wss://')
}

function websockettomessageport(ws: WebSocket): MessagePort {
  const { port1, port2 } = new MessageChannel()
  // Match submodule bind.js (Blob frames + transferable ArrayBuffer).
  ws.binaryType = 'blob'

  ws.onmessage = (event) => {
    if (event.data instanceof Blob) {
      void event.data.arrayBuffer().then((arr) => {
        const buf = new Uint8Array(arr)
        port1.postMessage(buf, [buf.buffer])
      })
      return
    }
    if (event.data instanceof ArrayBuffer) {
      const buf = new Uint8Array(event.data)
      port1.postMessage(buf, [buf.buffer])
      return
    }
    if (ArrayBuffer.isView(event.data)) {
      const view = event.data as ArrayBufferView
      const copy = new Uint8Array(view.byteLength)
      copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
      port1.postMessage(copy, [copy.buffer])
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
 * Gated WSS import. Dial early; fulfill only after allowfulfill() once the
 * socket is open. Expose a thenable (not a Promise instance) so Go Call("then")
 * always runs our forwarder against a still-pending native Promise.
 */
export function opengatedwssimport(src: string): GatedWssImport {
  let settle!: (port: MessagePort) => void
  let fail!: (err: Error) => void
  let port: MessagePort | null = null
  let dialstarted = false
  let released = false
  let settled = false
  let opensuccess = false
  let thencount = 0

  const promise = new Promise<MessagePort>((resolve, reject) => {
    settle = resolve
    fail = reject
  })

  const tryfulfill = () => {
    if (settled || !released || !port) {
      return
    }
    settled = true
    wanixperfmark('remote-wss-open', {
      url: src,
      thencount,
    })
    setTimeout(() => settle(port as MessagePort), 0)
  }

  const dial = () => {
    if (dialstarted) {
      return
    }
    dialstarted = true
    wanixperfmark('remote-wss-dial', { url: src })
    const ws = new WebSocket(src)
    ws.onopen = () => {
      wanixperfmark('remote-wss-socket-open', { url: src })
      try {
        port = websockettomessageport(ws)
        opensuccess = true
        tryfulfill()
      } catch (err) {
        if (settled) {
          return
        }
        settled = true
        wanixperfmark('remote-wss-error', { url: src })
        fail(
          err instanceof Error
            ? err
            : new Error(`wanix remote websocket port bridge failed: ${src}`),
        )
      }
    }
    ws.onerror = () => {
      if (settled || opensuccess) {
        return
      }
      settled = true
      wanixperfmark('remote-wss-error', { url: src })
      fail(new Error(`wanix remote websocket failed: ${src}`))
    }
    ws.onclose = () => {
      if (settled || opensuccess) {
        return
      }
      settled = true
      wanixperfmark('remote-wss-closed', { url: src })
      fail(new Error(`wanix remote websocket closed before open: ${src}`))
    }
  }

  const allowfulfill = () => {
    released = true
    wanixperfmark('remote-wss-fulfill-allowed', {
      url: src,
      thencount,
      hasPort: !!port,
    })
    tryfulfill()
  }

  const thenwaiters: Array<() => void> = []

  const thenable: PromiseLike<MessagePort> = {
    then(onfulfilled, onrejected) {
      thencount += 1
      wanixperfmark('remote-wss-then', { url: src, thencount })
      const waiters = thenwaiters.splice(0, thenwaiters.length)
      for (let i = 0; i < waiters.length; ++i) {
        waiters[i]()
      }
      return promise.then(onfulfilled, onrejected)
    },
  }

  const waitforthen = (timeoutms = 5_000) =>
    new Promise<void>((resolve, reject) => {
      if (thencount > 0) {
        resolve()
        return
      }
      const timer = setTimeout(() => {
        reject(
          new Error(
            `wanix remote import: AwaitErr never called then (${src})`,
          ),
        )
      }, timeoutms)
      thenwaiters.push(() => {
        clearTimeout(timer)
        resolve()
      })
    })

  return {
    thenable,
    promise,
    dial,
    allowfulfill,
    waitforthen,
    readthencount: () => thencount,
  }
}

/** Immediate dial+release (tests / connectedCallback fallback). */
export function openwssimport(src: string): PromiseLike<MessagePort> {
  const gated = opengatedwssimport(src)
  gated.dial()
  gated.allowfulfill()
  return gated.thenable
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
    const src =
      this.getAttribute('src') ||
      (typeof this.src === 'string' ? this.src : '') ||
      ''
    const type =
      this.getAttribute('type') ||
      (typeof this.type === 'string' ? this.type : '') ||
      'ns'
    if (type === 'import' && iswssremoteurl(src)) {
      this.style.display = 'none'
      this.dst = this.getAttribute('dst')
      this.src = src
      this.type = type
      // CDN wanix-bind always sets this.import = new Promise(iframe…). Never
      // call previous for WSS — that overwrites a gated thenable with a Promise
      // Go AwaitErr never settles (and our waitforthen thencount stays 0).
      if (!this.import || this.import instanceof Promise) {
        this.import = openwssimport(src)
      }
      return
    }
    previous.call(this)
  }
  patched = true
  wanixperfmark('remote-wss-bind-patched')
}
