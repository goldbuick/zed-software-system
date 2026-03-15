/**
 * Serialize acklook data to plain text for LLM consumption.
 * Strips color codes and formats board, scroll, sidebar, and tickers.
 * Formatters accept data blobs from memory queries (no zss/memory imports).
 */
import type { TOOL_DEF } from 'zss/feature/heavy/llm'
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

/**
 * Serialize tool definitions to plain text for system prompt (e.g. non-tool-calling models).
 * Includes full docs plus explicit output format instruction.
 */
export function formattoolsforsystemprompt(tools: TOOL_DEF[]): string {
  const lines: string[] = []
  lines.push('AVAILABLE TOOLS:')
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i]
    if (t.type !== 'function' || !t.function) {
      continue
    }
    const f = t.function
    lines.push(`- ${f.name}: ${f.description}`)
    const params = f.parameters as {
      type?: string
      properties?: Record<string, unknown>
      required?: string[]
    }
    if (params?.properties && typeof params.properties === 'object') {
      const props = Object.entries(params.properties) as [
        string,
        { type?: string; description?: string },
      ][]
      for (let j = 0; j < props.length; j++) {
        const [k, v] = props[j]
        const desc = v?.description ?? ''
        lines.push(`  - ${k}: ${desc}`)
      }
    }
  }
  lines.push('')
  lines.push(
    'To invoke a tool, output exactly: <tool_call>{"name":"tool_name","arguments":{...}}</tool_call>',
  )
  lines.push(
    'Example: <tool_call>{"name":"get_agent_info","arguments":{}}</tool_call>',
  )
  lines.push(
    'Example: <tool_call>{"name":"run_command","arguments":{"command":"#go n"}}</tool_call>',
  )
  return lines.join('\n')
}

export function formatsystemprompt(
  agentname: string,
  context?: string,
): string {
  const parts: string[] = []

  parts.push(
    `You are an AI agent named ${agentname}, operating in a game world.`,
  )
  parts.push('')
  parts.push(
    'ROLE: You are helpful, concise, and grounded in the current board state.',
  )
  parts.push('')
  parts.push(
    'CAPABILITIES: You can move, act on the board, inspect objects and terrain, run commands, read codepages (scripts), and navigate. Use tools when you need up-to-date state or must perform actions.',
  )
  parts.push('')
  parts.push('GUIDELINES:')
  parts.push(
    '- Use look_at_board when context is stale or you need fresh surroundings.',
  )
  parts.push(
    '- Use get_agent_info when asked who you are, your name, or what board you are on.',
  )
  parts.push(
    '- Prefer one or few tools per turn when acting; be clear over brief.',
  )
  parts.push(
    '- Reply in plain text when a tool is not needed (e.g. greeting, clarification).',
  )
  parts.push('')
  parts.push('ZSS COMMANDS (for run_command):')
  parts.push(AGENT_ZSS_COMMANDS)
  parts.push('')

  if (ispresent(context)) {
    parts.push('Current state:')
    parts.push(context)
  }

  return parts.join('\n').trimEnd()
}
