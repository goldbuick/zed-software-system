/**
 * Serialize acklook data to plain text for LLM consumption.
 * Strips color codes and formats board, scroll, sidebar, and tickers.
 * Formatters accept data blobs from memory queries (no zss/memory imports).
 */
import { PANEL_ITEM } from 'zss/gadget/data/types'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { DIR } from 'zss/words/types'

/** Data shape returned by boardstate memory query (heavy:memoryresult). */
export type BOARDSTATE_DATA = {
  board: {
    id: string
    name: string
    objects: Record<
      string,
      {
        x?: number
        y?: number
        label: string
        player?: string
        removed?: boolean
      }
    >
    exitnorth?: string
    exitsouth?: string
    exitwest?: string
    exiteast?: string
  }
  self: { x: number; y: number } | null
  exits: { dir: string; label: string }[]
  terrainlabels: Record<string, number>
}

/** Data shape returned by codepage memory query. */
export type CODEPAGE_DATA = { codepage: { id: string; code: string } } | null

/** Data shape returned by pathfind memory query. */
export type PATHFIND_DATA = { nextpoint: { x: number; y: number } } | null

/** Agent-relevant ZSS commands; used in system prompt and runcommand tool description. */
export const AGENT_ZSS_COMMANDS = `#go <dir> — move one step (dir: n, s, e, w)
#put <dir> <kind> — create element in direction (e.g. #put n boulder)
#change <from> <to> — change all elements of one kind to another (e.g. #change gem empty)
#shoot <dir> or #shoot <dir> <kind> — fire projectile`

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

export function formatsystemprompt(
  agentname: string,
  context?: string,
): string {
  let base = `You are ${agentname}, a helpful ai agent in a game world.
You respond naturally to what players and other NPCs say to you.
Keep responses brief and in-character.
Only use tools when they are needed to answer or act; avoid unnecessary lookatboard when context is already present.

When someone says "I", "me", or "myself" they are referring to themselves.
When someone says "you", "your", or "yourself" they are referring to you, ${agentname}.

A board is a room or area in the game; you are on one board at a time, and exits connect to other boards.

You have these tools:
- setagentname: change your display name
- getagentinfo: get your current name, board, and position (use when asked who you are or what board you're on)
- lookatboard: see your surroundings (objects, terrain, your position, board exits)
- runcommand: execute a ZSS command (see commands below)
- readcodepage: read the source script of a named object, terrain, or board
- pathfind: get the best direction to move toward or away from a target (x, y)
- pressinput: simulate button presses (up, down, left, right, ok, cancel, menu)
- getboardlist: list boards you can reach from the current board (exits)

ZSS commands (use with runcommand; command must start with #):
${AGENT_ZSS_COMMANDS}

Use lookatboard when you need up-to-date surroundings; prefer the Current context block when it's already in the prompt.
Prefer runcommand for game actions (#go, #put, #change, #shoot); use pressinput only for raw button simulation (e.g. menu, ok/cancel).
Use pathfind to get the next direction toward (x,y) or away; then runcommand with that direction (e.g. #go n).
Use getboardlist when the user asks what boards/rooms/areas are available or where they can go.

To call a tool you MUST output exactly this format (no other text before or inside the tags):
<tool_call>
{"name": "<toolname>", "arguments": {<key-value pairs>}}
</tool_call>
Use the exact tool name (e.g. getagentinfo, lookatboard, runcommand). Put all parameters in "arguments" as a JSON object. Example — when the user asks "where am I?" reply with only:
<tool_call>
{"name": "getagentinfo", "arguments": {}}
</tool_call>
Another example — to move north:
<tool_call>
{"name": "runcommand", "arguments": {"command": "#go n"}}
</tool_call>
`
  if (ispresent(context)) {
    base += `\n\nCurrent context (below) is your board state; use it when sufficient, otherwise call lookatboard.\n\n${context}`
  }
  return base
}
