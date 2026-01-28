/**
 * Serialize acklook data to plain text for LLM consumption.
 * Strips color codes and formats board, scroll, sidebar, and tickers.
 */
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
} from 'zss/memory/types'

export type ACKLOOK_LIKE = {
  board?: BOARD
  tickers?: string[]
  scrollname?: string
  scroll?: PANEL_ITEM[]
  sidebar?: PANEL_ITEM[]
}

/** Remove $color / $meta tokens for readable text. */
function stripcodes(s: string): string {
  return s.replace(/\$[a-zA-Z0-9]+/g, '').trim()
}

function panelitemtostring(item: PANEL_ITEM): string {
  if (isstring(item)) {
    return stripcodes(item)
  }
  if (isarray(item) && item.length > 1 && isstring(item[1])) {
    return String(item[1])
  }
  return ''
}

function panelitemstotext(items: PANEL_ITEM[] | undefined): string {
  if (!ispresent(items) || items.length === 0) {
    return ''
  }
  const lines: string[] = []
  for (let i = 0; i < items.length; i++) {
    const line = panelitemtostring(items[i])
    if (line) {
      lines.push(line)
    }
  }
  return lines.join('\n')
}

function elementchar(el: BOARD_ELEMENT | null | undefined): string {
  if (!ispresent(el)) {
    return ' '
  }
  const c = el.char ?? 32
  return c >= 32 && c < 127 ? String.fromCharCode(c) : ' '
}

/** Render board as a 60x25 grid of characters (terrain + objects). */
function boardtotext(board: BOARD | undefined): string {
  if (!ispresent(board)) {
    return ''
  }
  const w = BOARD_WIDTH
  const h = BOARD_HEIGHT
  const rows: string[] = []
  const terrain = board.terrain ?? []
  const objects = board.objects ?? {}

  for (let y = 0; y < h; y++) {
    let row = ''
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      const ter = terrain[idx]
      let ch = elementchar(ter)
      for (const id of Object.keys(objects)) {
        const obj = objects[id]
        if (obj?.x === x && obj?.y === y) {
          ch = elementchar(obj)
          break
        }
      }
      row += ch
    }
    rows.push(row)
  }
  return rows.join('\n')
}

/**
 * Format acklook data into a single string suitable for an LLM prompt.
 * Sections: board (grid), scroll name + content, sidebar, tickers.
 */
export function formatacklookfortext(data: ACKLOOK_LIKE): string {
  const parts: string[] = []

  if (ispresent(data.board)) {
    parts.push('[Board]')
    parts.push(boardtotext(data.board))
    parts.push('')
  }

  if (
    ispresent(data.scrollname) ||
    (ispresent(data.scroll) && data.scroll.length > 0)
  ) {
    parts.push('[Scroll]')
    if (data.scrollname) {
      parts.push(`Title: ${data.scrollname}`)
    }
    parts.push(panelitemstotext(data.scroll))
    parts.push('')
  }

  if (ispresent(data.sidebar) && data.sidebar.length > 0) {
    parts.push('[Sidebar]')
    parts.push(panelitemstotext(data.sidebar))
    parts.push('')
  }

  if (ispresent(data.tickers) && data.tickers.length > 0) {
    parts.push('[Tickers]')
    parts.push(data.tickers.join('\n'))
  }

  return parts.join('\n').trimEnd()
}
