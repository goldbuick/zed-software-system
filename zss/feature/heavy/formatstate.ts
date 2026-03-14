/**
 * Serialize acklook data to plain text for LLM consumption.
 * Strips color codes and formats board, scroll, sidebar, and tickers.
 */
import { PANEL_ITEM } from 'zss/gadget/data/types'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardoperations'
import { memoryreadelementkind } from 'zss/memory/boards'
import { memoryreadelementdisplay } from 'zss/memory/bookoperations'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadboardpath } from 'zss/memory/spatialqueries'
import { BOARD, BOARD_ELEMENT, CODE_PAGE_TYPE } from 'zss/memory/types'
import { COLLISION, DIR } from 'zss/words/types'

export type LOOK_STATE = {
  board?: BOARD
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

function boardtotext(board: BOARD | undefined): string {
  if (!ispresent(board)) {
    return ''
  }
  const rows: string[] = []
  void board
  return rows.join('\n')
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

function elementlabel(element: BOARD_ELEMENT): string {
  memoryreadelementkind(element)
  const display = memoryreadelementdisplay(element)
  const kind = element.kind ?? ''
  const name = display.name || kind
  return name
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

export function formatboardfortext(agentid: string): string {
  const board = memoryreadplayerboard(agentid)
  if (!ispresent(board)) {
    return 'You are not on any board.'
  }

  const parts: string[] = []
  parts.push(`BOARD: ${board.name || board.id}`)

  const self = memoryreadobject(board, agentid)
  if (ispresent(self)) {
    parts.push(`YOU: (${self.x ?? '?'}, ${self.y ?? '?'})`)
  }

  const objectlines: string[] = []
  const ids = Object.keys(board.objects)
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    if (id === agentid) {
      continue
    }
    const obj = board.objects[id]
    if (!ispresent(obj) || obj.removed) {
      continue
    }
    const label = elementlabel(obj)
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

  const terraincounts: Record<string, number> = {}
  for (let i = 0; i < board.terrain.length; ++i) {
    const tile = board.terrain[i]
    if (!ispresent(tile)) {
      terraincounts.empty = (terraincounts.empty ?? 0) + 1
      continue
    }
    memoryreadelementkind(tile)
    const display = memoryreadelementdisplay(tile)
    const label = display.name ?? tile.kind ?? ''
    terraincounts[label] = (terraincounts[label] ?? 0) + 1
  }

  const terrainentries = Object.entries(terraincounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${count} ${name}`)
  parts.push(`TERRAIN: ${terrainentries.join(', ')}`)

  return parts.join('\n')
}

export function readcodepagefortext(name: string, type?: string): string {
  let pagetype = CODE_PAGE_TYPE.OBJECT
  switch (type) {
    case 'terrain':
      pagetype = CODE_PAGE_TYPE.TERRAIN
      break
    case 'board':
      pagetype = CODE_PAGE_TYPE.BOARD
      break
  }

  const codepage = memorypickcodepagewithtypeandstat(pagetype, name)
  if (!ispresent(codepage)) {
    return `No ${type ?? 'object'} codepage found for "${name}".`
  }

  const source = codepage.code ?? ''
  if (!source) {
    return `Codepage "${name}" exists but has no source code.`
  }

  if (source.length > MAX_CODEPAGE_LENGTH) {
    return source.slice(0, MAX_CODEPAGE_LENGTH) + '\n... (truncated)'
  }
  return source
}

export function formatpathfindfortext(
  agentid: string,
  targetx: number,
  targety: number,
  flee?: boolean,
): string {
  const board = memoryreadplayerboard(agentid)
  if (!ispresent(board)) {
    return 'You are not on any board.'
  }

  const self = memoryreadobject(board, agentid)
  if (!ispresent(self) || !isnumber(self.x) || !isnumber(self.y)) {
    return 'Cannot determine your position.'
  }

  const frompt = { x: self.x, y: self.y }
  const topt = { x: targetx, y: targety }
  const nextpt = memoryreadboardpath(
    board,
    COLLISION.ISWALK,
    frompt,
    topt,
    flee ?? false,
  )

  if (!ispresent(nextpt)) {
    return flee
      ? `No path away from (${targetx}, ${targety}).`
      : `No path to (${targetx}, ${targety}).`
  }

  const dx = nextpt.x - frompt.x
  const dy = nextpt.y - frompt.y
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

export function formatsystemprompt(agentname: string): string {
  return `You are ${agentname}, an NPC in a game world.
You respond naturally to what players and other NPCs say to you.
Keep responses brief and in-character.

When someone says "I", "me", or "myself" they are referring to themselves.
When someone says "you", "your", or "yourself" they are referring to you, ${agentname}.

You have these tools:
- set_agent_name: change your display name
- look_at_board: see your surroundings (objects, terrain, your position)
- run_command: execute a ZSS command like #put <dir> <kind>, #change <from> <to>, #go <dir>, #shoot <dir>
- read_codepage: read the source script of a named object, terrain, or board
- pathfind: get the best direction to move toward or away from a target (x, y)
- press_input: simulate button presses (up, down, left, right, ok, cancel, menu)

Use look_at_board to understand your surroundings before acting.
Use pathfind to navigate toward a target position.
Use press_input for movement and interaction as a player would.
Use run_command for direct world modification like placing or changing elements.
`
}
