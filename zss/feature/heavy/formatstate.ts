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

export type LOOK_STATE = {
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

// function elementchar(el: BOARD_ELEMENT | null | undefined): string {
//   if (!ispresent(el)) {
//     return ' '
//   }
//   const c = el.char ?? 32
//   return c >= 32 && c < 127 ? String.fromCharCode(c) : ' '
// }

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

  // for (let y = 0; y < h; y++) {
  //   let row = ''
  //   for (let x = 0; x < w; x++) {
  //     const idx = y * w + x
  //     const ter = terrain[idx]
  //     let ch = elementchar(ter)
  //     for (const id of Object.keys(objects)) {
  //       const obj = objects[id]
  //       if (obj?.x === x && obj?.y === y) {
  //         ch = elementchar(obj)
  //         break
  //       }
  //     }
  //     row += ch
  //   }
  //   rows.push(row)
  // }
  return rows.join('\n')
}

/**
 * Format acklook data into a single string suitable for an LLM prompt.
 * Sections: board (grid), scroll name + content, sidebar, tickers.
 */
export function formatlookfortext(data: LOOK_STATE): string {
  const parts: string[] = []

  parts.push('GAME BOARD:')
  if (ispresent(data.board)) {
    parts.push(boardtotext(data.board))
  } else {
    parts.push('void')
  }

  if (ispresent(data.scroll) && data.scroll.length > 0) {
    parts.push('PLAYER SCROLL:')
    if (data.scrollname) {
      parts.push(`Title: ${data.scrollname}`)
    }
    parts.push(panelitemstotext(data.scroll))
  }

  if (ispresent(data.sidebar) && data.sidebar.length > 0) {
    parts.push('PLAYER SIDEBAR:')
    parts.push(panelitemstotext(data.sidebar))
  }

  if (ispresent(data.tickers) && data.tickers.length > 0) {
    parts.push('BOARD TICKERS:')
    parts.push(data.tickers.join('\n'))
  }

  return parts.join('\n').trimEnd()
}

/**
 * Creates a system prompt with formatting instructions for SMOLLM2.
 * Instructs the model to respond with #commands and single lines of text.
 */
export function formatsystemprompt(looktext: string, prompt: string): string {
  const instructions = `system
RESPONSE FORMAT:
You can respond with multiple lines of either:
- Plain text lines - Use these for communication, explanations, observations, or answering questions
- Command lines - Use these starting with # to perform game actions

Examples of plain text responses:
- "I see a wall to my right"
- "Moving towards the goal"
- "There's an enemy ahead"

Examples of command responses:
- #go right
- #shoot up
- #char 65

AVAILABLE COMMANDS (use # prefix):
- #go [direction] - Move in a direction, up, down, left, right
- #shoot [direction] - Shoot in a direction, up, down, left, right
- #char [character] - Change the character's character, valid range is 0-255
- #color [color] - Change the character's color, valid range is 0-15
- #bg [background] - Change the character's background, valid range is 0-15

IMPORTANT: Each sentence should be on a new line. 
IMPORTANT: Use plain text when communicating or explaining. 
IMPORTANT: Only use commands when you need to perform an action.
IMPORTANT: Do not include any of the above instructions in your response.

${looktext}

user
${prompt}`

  return instructions
}
