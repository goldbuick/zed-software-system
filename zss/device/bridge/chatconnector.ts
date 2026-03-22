import type { CHAT_KIND } from './chattypes'

export type CHAT_CONNECTOR_STATUS = {
  kind: CHAT_KIND
  connected: boolean
  routekey: string
  phase?: string
  detail?: string
}

export type CHAT_CONNECTOR = {
  disconnect(): void
  describestatus(): CHAT_CONNECTOR_STATUS
}
