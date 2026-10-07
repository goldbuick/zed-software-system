import type { CHAT_CONNECTOR } from './chatconnector'

export type TWITCH_CHAT_STATUS = {
  connected: number
  channel: string
  username: string
}

let live: CHAT_CONNECTOR | undefined

export function settwitchchatlive(conn: CHAT_CONNECTOR | undefined) {
  live = conn
}

export function twitchchatstatus(): TWITCH_CHAT_STATUS {
  if (!live) {
    return { connected: 0, channel: '', username: '' }
  }
  const status = live.describestatus()
  return {
    connected: status.connected ? 1 : 0,
    channel: status.detail ?? '',
    username: status.username ?? '',
  }
}
