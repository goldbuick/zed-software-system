import type { CHAT_KIND } from './chattypes'

export type CHAT_CONNECTOR_STATUS = {
  kind: CHAT_KIND
  connected: boolean
  routekey: string
  phase?: string
  detail?: string
  /** Logged-in nick when this connection has one. */
  username?: string
}

export type CHAT_CONNECTOR = {
  disconnect(): void
  describestatus(): CHAT_CONNECTOR_STATUS
  /** Present when this connector can post. Rejects if it cannot speak. */
  say?(text: string): Promise<void>
  canspeak?(): boolean
}
