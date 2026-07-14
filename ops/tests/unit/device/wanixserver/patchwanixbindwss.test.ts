/**
 * @jest-environment jsdom
 */
import {
  iswssremoteurl,
  opengatedwssimport,
  openwssimport,
  patchwanixbindwss,
} from 'zss/device/wanixserver/patchwanixbindwss'

describe('patchwanixbindwss helpers', () => {
  it('iswssremoteurl matches ws and wss', () => {
    expect(iswssremoteurl('wss://localhost:8765/')).toBe(true)
    expect(iswssremoteurl('WS://localhost:1/')).toBe(true)
    expect(iswssremoteurl('https://example/')).toBe(false)
  })

  it('openwssimport rejects when the socket errors before open', async () => {
    class FakeWebSocket {
      static CONNECTING = 0
      static OPEN = 1
      static CLOSING = 2
      static CLOSED = 3
      readyState = FakeWebSocket.CONNECTING
      onopen: ((ev: Event) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      onclose: ((ev: CloseEvent) => void) | null = null
      onmessage: ((ev: MessageEvent) => void) | null = null
      constructor(_url: string) {
        queueMicrotask(() => {
          this.readyState = FakeWebSocket.CLOSED
          this.onerror?.(new Event('error'))
        })
      }
      close() {
        this.readyState = FakeWebSocket.CLOSED
      }
      send(_data: unknown) {}
    }
    const previous = globalThis.WebSocket
    ;(globalThis as { WebSocket: typeof FakeWebSocket }).WebSocket =
      FakeWebSocket
    try {
      await expect(Promise.resolve(openwssimport('wss://127.0.0.1:9/'))).rejects.toThrow(
        /websocket failed/,
      )
    } finally {
      ;(globalThis as { WebSocket: typeof previous }).WebSocket = previous
    }
  })

  it('thenable registers before fulfill so late Go-style then still works', async () => {
    class FakeMessagePort {
      onmessage: ((ev: MessageEvent) => void) | null = null
      onclose: (() => void) | null = null
      close() {}
      postMessage(_data: unknown, _transfer?: unknown) {}
      start() {}
    }
    class FakeMessageChannel {
      port1 = new FakeMessagePort()
      port2 = new FakeMessagePort()
    }
    class FakeWebSocket {
      static CONNECTING = 0
      static OPEN = 1
      static CLOSING = 2
      static CLOSED = 3
      readyState = FakeWebSocket.CONNECTING
      binaryType = 'blob'
      onopen: ((ev: Event) => void) | null = null
      onerror: ((ev: Event) => void) | null = null
      onclose: ((ev: CloseEvent) => void) | null = null
      onmessage: ((ev: MessageEvent) => void) | null = null
      constructor(_url: string) {
        queueMicrotask(() => {
          this.readyState = FakeWebSocket.OPEN
          this.onopen?.(new Event('open'))
        })
      }
      close() {
        this.readyState = FakeWebSocket.CLOSED
      }
      send(_data: unknown) {}
    }
    const previousws = globalThis.WebSocket
    const previousmc = (globalThis as { MessageChannel?: unknown })
      .MessageChannel
    ;(globalThis as { WebSocket: typeof FakeWebSocket }).WebSocket =
      FakeWebSocket
    ;(globalThis as { MessageChannel: typeof FakeMessageChannel }).MessageChannel =
      FakeMessageChannel
    try {
      const gated = opengatedwssimport('wss://127.0.0.1:8765/')
      gated.dial()
      await new Promise<void>((resolve) => setTimeout(resolve, 20))
      // Simulate Go Call("then") while still pending.
      const got = new Promise<MessagePort>((resolve, reject) => {
        void gated.thenable.then(resolve, reject)
      })
      await new Promise<void>((resolve) => setTimeout(resolve, 10))
      gated.allowfulfill()
      const port = await got
      expect(port).toBeTruthy()
      expect(gated.thenable instanceof Promise).toBe(false)
    } finally {
      ;(globalThis as { WebSocket: typeof previousws }).WebSocket = previousws
      if (previousmc) {
        ;(globalThis as { MessageChannel: typeof previousmc }).MessageChannel =
          previousmc as typeof FakeMessageChannel
      } else {
        delete (globalThis as { MessageChannel?: unknown }).MessageChannel
      }
    }
  })

  it('patchwanixbindwss is a no-op when wanix-bind is undefined', () => {
    expect(() => patchwanixbindwss()).not.toThrow()
  })
})
