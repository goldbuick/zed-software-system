/**
 * Serialize acklook data to plain text for LLM consumption.
 * Strips color codes and formats board, scroll, sidebar, and tickers.
 * Formatters accept data blobs from boardstate query; `BOARDSTATE_DATA` is defined in `zss/memory/boardstatequery`.
 */
import { PANEL_ITEM } from 'zss/gadget/data/types'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import type { BOARDSTATE_DATA } from 'zss/memory/boardstatequery'
import { DIR } from 'zss/words/types'

export type { BOARDSTATE_DATA }

/** Data shape returned by codepage memory query. */
export type CODEPAGE_DATA = { codepage: { id: string; code: string } } | null

/** Data shape returned by pathfind memory query. */
export type PATHFIND_DATA = { nextpoint: { x: number; y: number } } | null

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
- \`#agent model\`: show active heavy LLM preset; \`#agent model list\`: list presets; \`#agent model llama|phi|qwen\`: switch ONNX preset (persisted in register storage)
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

const MAX_CODEPAGE_LENGTH = 1500

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

function dirtostring(dir: DIR): string {
  switch (dir) {
    case DIR.NORTH:
      return 'north'
    case DIR.SOUTH:
      return 'south'
    case DIR.WEST:
      return 'west'
    case DIR.EAST:
      return 'east'
    default:
      return 'idle'
  }
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

  const objectlines: string[] = []
  const ids = Object.keys(board.objects)
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    const obj = board.objects[id]
    if (!ispresent(obj) || obj.removed) {
      continue
    }
    const label = obj.label
    const playermarker = ispresent(obj.player) ? ' [player]' : ''
    objectlines.push(
      `- ${label}${playermarker} at (${obj.x ?? '?'}, ${obj.y ?? '?'})`,
    )
  }

  if (objectlines.length > 0) {
    parts.push('OBJECTS:')
    parts.push(...objectlines)
  } else {
    parts.push('OBJECTS: none')
  }

  const terrainentries = Object.entries(d.terrainlabels)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${count} ${name}`)
  parts.push(`TERRAIN: ${terrainentries.join(', ')}`)

  if (d.exits.length > 0) {
    const exitlines = d.exits.map((e) => `${e.dir} -> ${e.label}`)
    parts.push(`EXITS: ${exitlines.join(', ')}`)
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

export function formatboardlistfortext(
  data: BOARDSTATE_DATA | { error: string },
): string {
  if ('error' in data && data.error === 'no_board') {
    return 'You are not on any board.'
  }
  const d = data as BOARDSTATE_DATA
  if (d.exits.length === 0) {
    return 'Boards you can reach: (none from here)'
  }
  const exitlines = d.exits.map((e) => `${e.dir} -> ${e.label}`)
  return `Boards you can reach: ${exitlines.join(', ')}`
}

export function formatagentinfofortext(
  data: BOARDSTATE_DATA | { error: string },
  agentid: string,
  agentname: string,
): string {
  if ('error' in data && data.error === 'no_board') {
    return `You are ${agentname} (id: ${agentid}). You are not on any board.`
  }
  const d = data as BOARDSTATE_DATA
  const pos =
    ispresent(d.self) && isnumber(d.self.x) && isnumber(d.self.y)
      ? `(${d.self.x}, ${d.self.y})`
      : '(unknown)'
  const boardlabel = d.board.name || d.board.id
  return `You are ${agentname} (id: ${agentid}), on board "${boardlabel}", at ${pos}.`
}

export function readcodepagefortext(
  data: CODEPAGE_DATA | { error: string },
  name: string,
  type?: string,
): string {
  if (data === null || (typeof data === 'object' && 'error' in data)) {
    return `No ${type ?? 'object'} codepage found for "${name}".`
  }
  const source = data.codepage?.code ?? ''
  if (!source) {
    return `Codepage "${name}" exists but has no source code.`
  }
  if (source.length > MAX_CODEPAGE_LENGTH) {
    return source.slice(0, MAX_CODEPAGE_LENGTH) + '\n... (truncated)'
  }
  return source
}

export function formatpathfindfortext(
  data: PATHFIND_DATA | { error: string },
  fromx: number,
  fromy: number,
  targetx: number,
  targety: number,
  flee?: boolean,
): string {
  if (data === null) {
    return flee
      ? `No path away from (${targetx}, ${targety}).`
      : `No path to (${targetx}, ${targety}).`
  }
  if ('error' in data) {
    if (data.error === 'no_board') {
      return 'You are not on any board.'
    }
    if (data.error === 'no_self') {
      return 'Cannot determine your position.'
    }
  }
  if (typeof data !== 'object' || !('nextpoint' in data)) {
    return flee
      ? `No path away from (${targetx}, ${targety}).`
      : `No path to (${targetx}, ${targety}).`
  }
  const nextpt = (
    data as {
      nextpoint: { x: number; y: number } | null
    }
  ).nextpoint
  if (!nextpt) {
    return flee
      ? `No path away from (${targetx}, ${targety}).`
      : `No path to (${targetx}, ${targety}).`
  }
  const dx = nextpt.x - fromx
  const dy = nextpt.y - fromy
  let dir: MAYBE<DIR>
  if (dy < 0) {
    dir = DIR.NORTH
  } else if (dy > 0) {
    dir = DIR.SOUTH
  } else if (dx < 0) {
    dir = DIR.WEST
  } else if (dx > 0) {
    dir = DIR.EAST
  }

  if (!ispresent(dir)) {
    return 'Already at target.'
  }

  const verb = flee ? 'Flee' : 'Move'
  return `${verb} ${dirtostring(dir)} to reach (${nextpt.x}, ${nextpt.y}).`
}
