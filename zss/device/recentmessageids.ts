/** Bounded FIFO of recent message ids for cross-realm / peer echo dedupe. */

const DEFAULT_RECENT_MESSAGE_IDS_CAP = 4096

export type RECENT_MESSAGE_IDS = {
  has: (id: string) => boolean
  add: (id: string) => void
  clear: () => void
}

export function createrecentmessageids(
  cap = DEFAULT_RECENT_MESSAGE_IDS_CAP,
): RECENT_MESSAGE_IDS {
  const order: string[] = []
  const seen = new Set<string>()

  return {
    has(id) {
      return seen.has(id)
    },
    add(id) {
      if (seen.has(id)) {
        return
      }
      seen.add(id)
      order.push(id)
      while (order.length > cap) {
        const oldest = order.shift()
        if (oldest !== undefined) {
          seen.delete(oldest)
        }
      }
    },
    clear() {
      order.length = 0
      seen.clear()
    },
  }
}
