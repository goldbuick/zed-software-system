import { CHAT_KIND } from 'zss/device/bridge/chattypes'

const byKind: Record<CHAT_KIND, number> = {
  [CHAT_KIND.TWITCH]: 0,
  [CHAT_KIND.RSS]: 0,
  [CHAT_KIND.MASTODON]: 0,
  [CHAT_KIND.BLUESKY]: 0,
}

let total = 0

export function recordChatMessage(kind: CHAT_KIND) {
  ++byKind[kind]
  ++total
}

export function readChatMessageStats() {
  return {
    total,
    byKind: { ...byKind },
  }
}
