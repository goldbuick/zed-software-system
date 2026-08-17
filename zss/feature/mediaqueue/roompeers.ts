/** Pure helpers for media-queue board-room peer selection. */

export type MEDIAQUEUE_ROSTER_ENTRY = {
  player: string
  peerid: string
}

/** Peer ids for board players except self (board == room). */
export function mediaqueueroompeerids(
  boardplayers: string[],
  roster: MEDIAQUEUE_ROSTER_ENTRY[],
  selfpeerid: string | undefined,
): string[] {
  const peerbyplayer = new Map<string, string>()
  for (let i = 0; i < roster.length; ++i) {
    const entry = roster[i]
    if (entry?.player && entry.peerid) {
      peerbyplayer.set(entry.player, entry.peerid)
    }
  }
  const out: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < boardplayers.length; ++i) {
    const player = boardplayers[i]
    const peerid = peerbyplayer.get(player)
    if (!peerid || peerid === selfpeerid || seen.has(peerid)) {
      continue
    }
    seen.add(peerid)
    out.push(peerid)
  }
  return out
}
