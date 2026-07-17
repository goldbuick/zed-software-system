import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'

export const JOIN_STATUS_SCROLLNAME = 'joining'

/** Rewrite the join status scroll (2-3 concise lines). */
export function joinstatusscroll(player: string, ...lines: string[]): void {
  const content = lines.filter((line) => `${line}`.length > 0).join('\n')
  scrollwritelines(player, JOIN_STATUS_SCROLLNAME, content, 'refscroll')
}

/** Leave the join scroll open with LINKDEAD after a failed lookup/join. */
export function joinstatuslinkdead(player: string, detail = ''): void {
  if (detail.trim()) {
    joinstatusscroll(player, '$redLINKDEAD', `$white${detail.trim()}`)
    return
  }
  joinstatusscroll(player, '$redLINKDEAD')
}
