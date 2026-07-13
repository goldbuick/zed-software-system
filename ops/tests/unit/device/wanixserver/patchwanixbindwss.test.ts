/**
 * @jest-environment jsdom
 */
import {
  iswssremoteurl,
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
      await expect(openwssimport('wss://127.0.0.1:9/')).rejects.toThrow(
        /websocket failed/,
      )
    } finally {
      ;(globalThis as { WebSocket: typeof previous }).WebSocket = previous
    }
  })

  it('patchwanixbindwss is a no-op when wanix-bind is undefined', () => {
    expect(() => patchwanixbindwss()).not.toThrow()
  })
})
