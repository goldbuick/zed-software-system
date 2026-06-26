/**
 * Serialize acklook data to plain text for LLM consumption.
 * Strips color codes and formats board, scroll, sidebar, and tickers.
 * `formatboardfortext` / `formatboardlistfortext` use zsstext table lines for `#query`;
 * use `stripzsstextcodesforllm` when the same snapshot is sent to an LLM.
 * Formatters accept data blobs from boardstate query; `BOARDSTATE_DATA` is defined in `zss/memory/boardstatequery`.
 */
import { zsstexttablelines } from 'zss/feature/zsstextui'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'
import type { BOARDSTATE_DATA } from 'zss/memory/boardstatequery'

export type { BOARDSTATE_DATA }

const AGENT_COLORS =
  'black, dkblue, dkgreen, dkcyan, dkred, dkpurple, dkyellow, ltgray, dkgray, blue, green, cyan, red, purple, yellow, white, onblack, ondkblue, ondkgreen, ondkcyan, ondkred, ondkpurple, ondkyellow, onltgray, ondkgray, onblue, ongreen, oncyan, onred, onpurple, onyellow, onwhite'

/** Agent-relevant ZSS commands; used in system prompt. */
export const AGENT_ZSS_COMMANDS = `
- \`#userinput <key>\`: press a game key. ONLY one key per line: up, down, left, right, shootup, shootdown, shootleft, shootright, ok, cancel. To repeat, use multiple lines (e.g. 3x up = three lines of \`#userinput up\`)
- \`#pilot <x> <y>\`: pathfind to coordinates (cannot cross board edges), e.g. \`#pilot 10 5\`
- \`#pilot stop\`: cancel current navigation
- \`#goto <board>\`: move to another board, e.g. \`#goto title\`
- \`#put <dir> <color?> <kind>\`: place element in direction, e.g. \`#put n purple solid\`
- \`#change <color?> <from> <color?> <to>\`: change elements, e.g. \`#change gem red gem\`
- \`#set user <name>\`: change your display name
- \`#agent model\`: show the in-browser Gemma 4 E2B agent model info
- \`#continue\`: request another turn to observe results before acting again
- \`#query\`: print a text snapshot of the current board (objects, terrain counts, exits, kinds)
- \`#look\`: print scroll, sidebar, and board tickers (player UI text snapshot)
`.trim()

export type LOOK_STATE = {
  board?: unknown
  tickers?: string[]
  scrollname?: string
  scroll?: PANEL_ITEM[]
  sidebar?: PANEL_ITEM[]
}

/** Remove zsstext `$name` / `$123` tokens for LLM-safe board snapshots. */
export function stripzsstextcodesforllm(s: string): string {
  return s.replace(/\$[a-zA-Z0-9]+/g, '')
}

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

function boardtotext(__: unknown): string {
  void __
  return ''
}

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

export function formatboardfortext(
  data: BOARDSTATE_DATA | { error: string },
): string {
  if ('error' in data && data.error === 'no_board') {
    return 'You are not on any board.'
  }
  const d = data as BOARDSTATE_DATA
  const board = d.board
  const parts: string[] = []
  parts.push(`BOARD: ${board.name || board.id}`)

  if (ispresent(d.self)) {
    parts.push(`YOU: (${d.self.x ?? '?'}, ${d.self.y ?? '?'})`)
  }

  const objectrows: string[][] = []
  const ids = Object.keys(board.objects)
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    const obj = board.objects[id]
    if (!ispresent(obj) || obj.removed) {
      continue
    }
    objectrows.push([
      obj.label,
      String(obj.x ?? '?'),
      String(obj.y ?? '?'),
      ispresent(obj.player) ? 'yes' : '',
    ])
  }

  if (objectrows.length > 0) {
    parts.push('OBJECTS:')
    parts.push(...zsstexttablelines(objectrows, ['label', 'x', 'y', 'player']))
  } else {
    parts.push('OBJECTS: none')
  }

  const terrainrows = Object.entries(d.terrainlabels)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => [String(count), name])
  parts.push('TERRAIN:')
  if (terrainrows.length > 0) {
    parts.push(...zsstexttablelines(terrainrows, ['count', 'name']))
  }

  if (d.exits.length > 0) {
    const exitrows = d.exits.map((e) => [e.dir, e.label])
    parts.push('EXITS:')
    parts.push(...zsstexttablelines(exitrows, ['dir', 'board']))
  }

  parts.push(`COLORS: ${AGENT_COLORS}`)
  if (d.objectkinds.length > 0) {
    parts.push(`OBJECT KINDS: ${d.objectkinds.join(', ')}`)
  }
  if (d.terrainkinds.length > 0) {
    parts.push(`TERRAIN KINDS: ${d.terrainkinds.join(', ')}`)
  }

  return parts.join('\n')
}

export function formatagentinfofortext(
  data: BOARDSTATE_DATA | { error: string },
  contextplayer: string,
  agentname: string,
): string {
  if ('error' in data && data.error === 'no_board') {
    return `You are ${agentname}, assisting the player (id: ${contextplayer}). The player is not on any board.`
  }
  const d = data as BOARDSTATE_DATA
  const pos =
    ispresent(d.self) && isnumber(d.self.x) && isnumber(d.self.y)
      ? `(${d.self.x}, ${d.self.y})`
      : '(unknown)'
  const boardlabel = d.board.name || d.board.id
  return `You are ${agentname}, assisting the player (id: ${contextplayer}) on board "${boardlabel}" at ${pos}.`
}
