import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memoryreadobject } from 'zss/memory/boardoperations'
import {
  memoryreadboardbyaddress,
  memoryreadelementkind,
} from 'zss/memory/boards'
import { memoryreadelementdisplay } from 'zss/memory/bookoperations'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadboardpath } from 'zss/memory/spatialqueries'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'
import { ispresent, isstring } from 'zss/mapping/types'

export type BOARDSTATE_RESULT = {
  board: {
    id: string
    name: string
    objects: Record<
      string,
      { x?: number; y?: number; label: string; player?: string; removed?: boolean }
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

export type PATHFIND_RESULT = { nextpoint: { x: number; y: number } } | null

export type CODEPAGE_RESULT = { codepage: { id: string; code: string } } | null

function elementlabel(element: { kind?: string; [k: string]: unknown }): string {
  const display = memoryreadelementdisplay(element as any)
  const kind = element.kind ?? ''
  return display.name || kind
}

function runboardstate(agentid: string): BOARDSTATE_RESULT | { error: string } {
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
      removed: obj.removed,
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
  }
}

function runcodepage(
  pagetype: number,
  name: string,
): CODEPAGE_RESULT | { error: string } {
  const codepage = memorypickcodepagewithtypeandstat(pagetype, name)
  if (!ispresent(codepage)) {
    return { error: 'not_found' }
  }
  return {
    codepage: { id: codepage.id, code: codepage.code ?? '' },
  }
}

function runpathfind(
  agentid: string,
  targetx: number,
  targety: number,
  flee: boolean,
): PATHFIND_RESULT | { error: string } {
  const board = memoryreadplayerboard(agentid)
  if (!ispresent(board)) {
    return { error: 'no_board' }
  }
  const self = memoryreadobject(board, agentid)
  if (
    !ispresent(self) ||
    typeof self.x !== 'number' ||
    typeof self.y !== 'number'
  ) {
    return { error: 'no_self' }
  }
  const frompt = { x: self.x, y: self.y }
  const topt = { x: targetx, y: targety }
  const nextpt = memoryreadboardpath(
    board,
    COLLISION.ISWALK,
    frompt,
    topt,
    flee,
  )
  if (!ispresent(nextpt)) {
    return null
  }
  return { nextpoint: { x: nextpt.x, y: nextpt.y } }
}

export function handlememoryquery(vm: DEVICE, message: MESSAGE): void {
  const payload = message.data
  if (
    !payload ||
    typeof payload !== 'object' ||
    !isstring((payload as any).id) ||
    !isstring((payload as any).type)
  ) {
    return
  }
  const { id, type } = payload as { id: string; type: string }
  try {
    let result: unknown
    switch (type) {
      case 'boardstate': {
        const agentid = (payload as any).agentid
        if (!isstring(agentid)) {
          vm.emit(message.player, 'heavy:memoryresult', { id, error: 'missing_agentid' })
          return
        }
        const out = runboardstate(agentid)
        if ('error' in out) {
          vm.emit(message.player, 'heavy:memoryresult', { id, error: out.error })
          return
        }
        result = out
        break
      }
      case 'codepage': {
        const pagetype =
          typeof (payload as any).pagetype === 'number'
            ? (payload as any).pagetype
            : CODE_PAGE_TYPE.OBJECT
        const name = (payload as any).name
        if (!isstring(name)) {
          vm.emit(message.player, 'heavy:memoryresult', { id, error: 'missing_name' })
          return
        }
        const out = runcodepage(pagetype, name)
        if ('error' in out) {
          vm.emit(message.player, 'heavy:memoryresult', { id, error: out.error })
          return
        }
        result = out
        break
      }
      case 'pathfind': {
        const agentid = (payload as any).agentid
        const targetx = Number((payload as any).targetx)
        const targety = Number((payload as any).targety)
        const flee = (payload as any).flee === true
        if (!isstring(agentid) || !Number.isFinite(targetx) || !Number.isFinite(targety)) {
          vm.emit(message.player, 'heavy:memoryresult', { id, error: 'invalid_params' })
          return
        }
        const out = runpathfind(agentid, targetx, targety, flee)
        if (typeof out === 'object' && out !== null && 'error' in out) {
          vm.emit(message.player, 'heavy:memoryresult', { id, error: (out as any).error })
          return
        }
        result = out
        break
      }
      default:
        vm.emit(message.player, 'heavy:memoryresult', { id, error: 'unknown_type' })
        return
    }
    vm.emit(message.player, 'heavy:memoryresult', { id, result })
  } catch (err) {
    vm.emit(message.player, 'heavy:memoryresult', {
      id,
      error: err instanceof Error ? err.message : 'unknown_error',
    })
  }
}
