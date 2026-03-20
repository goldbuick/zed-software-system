import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardoperations'
import {
  memoryreadboardbyaddress,
  memoryreadelementkind,
} from 'zss/memory/boards'
import { memoryreadelementdisplay } from 'zss/memory/bookoperations'
import { memoryreadcodepagename } from 'zss/memory/codepageoperations'
import { memorylistallcodepagewithtype } from 'zss/memory/codepages'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryruncli } from 'zss/memory/runtime'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

export type BOARDSTATE_RESULT = {
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
  objectkinds: string[]
  terrainkinds: string[]
}

export type PATHFIND_RESULT = { nextpoint: { x: number; y: number } } | null

export type CODEPAGE_RESULT = { codepage: { id: string; code: string } } | null

function elementlabel(element: {
  kind?: string
  [k: string]: unknown
}): string {
  const display = memoryreadelementdisplay(element as any)
  const kind = element.kind ?? ''
  return display.name || kind
}

function readboardstate(
  agentid: string,
): BOARDSTATE_RESULT | { error: string } {
  const board = memoryreadplayerboard(agentid)
  if (!ispresent(board)) {
    return { error: 'no_board' }
  }
  const self = memoryreadobject(board, agentid)
  const selfpt =
    ispresent(self) && typeof self.x === 'number' && typeof self.y === 'number'
      ? { x: self.x, y: self.y }
      : null

  const objects: BOARDSTATE_RESULT['board']['objects'] = {}
  const ids = Object.keys(board.objects)
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    const obj = board.objects[id]
    if (!ispresent(obj) || obj.removed) {
      continue
    }
    memoryreadelementkind(obj)
    const label = elementlabel(obj)
    objects[id] = {
      x: obj.x,
      y: obj.y,
      label,
      player: obj.player,
      removed: !!obj.removed,
    }
  }

  const terrainlabels: Record<string, number> = {}
  for (let i = 0; i < board.terrain.length; ++i) {
    const tile = board.terrain[i]
    if (!ispresent(tile)) {
      terrainlabels.empty = (terrainlabels.empty ?? 0) + 1
      continue
    }
    memoryreadelementkind(tile)
    const display = memoryreadelementdisplay(tile)
    const label = display.name ?? tile.kind ?? ''
    terrainlabels[label] = (terrainlabels[label] ?? 0) + 1
  }

  const exitdirs: [string, string | undefined][] = [
    ['north', board.exitnorth],
    ['south', board.exitsouth],
    ['west', board.exitwest],
    ['east', board.exiteast],
  ]
  const exits: { dir: string; label: string }[] = []
  for (let i = 0; i < exitdirs.length; ++i) {
    const [dir, addr] = exitdirs[i]
    if (ispresent(addr) && addr !== '') {
      const dest = memoryreadboardbyaddress(addr)
      const label = dest?.name ?? dest?.id ?? addr
      exits.push({ dir, label })
    }
  }

  const objectpages = memorylistallcodepagewithtype(CODE_PAGE_TYPE.OBJECT)
  const objectkinds = [
    ...new Set(
      objectpages
        .map((p) => memoryreadcodepagename(p))
        .filter((n) => n && n !== 'player'),
    ),
  ]

  const terrainpages = memorylistallcodepagewithtype(CODE_PAGE_TYPE.TERRAIN)
  const terrainkinds = [
    'empty',
    ...new Set(
      terrainpages.map((p) => memoryreadcodepagename(p)).filter(Boolean),
    ),
  ]

  return {
    board: {
      id: board.id,
      name: board.name,
      objects,
      exitnorth: board.exitnorth,
      exitsouth: board.exitsouth,
      exitwest: board.exitwest,
      exiteast: board.exiteast,
    },
    self: selfpt,
    exits,
    terrainlabels,
    objectkinds,
    terrainkinds,
  }
}

export function handlememoryquery(vm: DEVICE, message: MESSAGE): void {
  const payload = message.data
  if (!ispresent(payload) || !isstring(payload.id) || !isstring(payload.type)) {
    return
  }
  const agentid = message.player
  const { id, type } = payload as { id: string; type: string }
  try {
    let result: unknown
    switch (type) {
      case 'boardstate': {
        const out = readboardstate(agentid)
        if ('error' in out) {
          vm.emit(agentid, 'heavy:memoryresult', {
            id,
            error: out.error,
          })
          return
        }
        result = out
        break
      }
      case 'runcli': {
        const command = payload.command
        if (!isstring(command)) {
          vm.emit(agentid, 'heavy:memoryresult', {
            id,
            error: 'missing_command',
          })
          return
        }
        memoryruncli(agentid, command, false)
        result = { ok: true }
        break
      }
      default:
        vm.emit(agentid, 'heavy:memoryresult', {
          id,
          error: 'unknown_type',
        })
        return
    }
    vm.emit(agentid, 'heavy:memoryresult', { id, result })
  } catch (err) {
    vm.emit(agentid, 'heavy:memoryresult', {
      id,
      error: err instanceof Error ? err.message : 'unknown_error',
    })
  }
}
