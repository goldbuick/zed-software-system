import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { INPUT } from 'zss/gadget/data/types'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardaccess'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadboardpath } from 'zss/memory/spatialqueries'
import { COLLISION } from 'zss/words/types'

const PILOT_TICK_INTERVAL = 2
const PILOT_STUCK_THRESHOLD = 50

type PILOT_STATE = {
  targetx: number
  targety: number
  lastx: number
  lasty: number
  stuckticks: number
  tickcounter: number
}

const pilots: Record<string, PILOT_STATE> = {}

export function handlepilotstart(_vm: DEVICE, message: MESSAGE): void {
  const data = message.data as { x?: number; y?: number } | undefined
  if (!ispresent(data) || !isnumber(data.x) || !isnumber(data.y)) {
    return
  }
  pilots[message.player] = {
    targetx: data.x,
    targety: data.y,
    lastx: -1,
    lasty: -1,
    stuckticks: 0,
    tickcounter: 0,
  }
}

export function handlepilotstop(_vm: DEVICE, message: MESSAGE): void {
  delete pilots[message.player]
}

export function pilotclear(playerid: string): void {
  delete pilots[playerid]
}

export function handlepilotclear(_vm: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    pilotclear(message.data)
  }
}

function pilotnotify(vm: DEVICE, playerid: string, text: string): void {
  vm.emit(playerid, 'heavy:pilotnotify', { agentid: playerid, message: text })
}

export function pilottick(vm: DEVICE): void {
  const ids = Object.keys(pilots)
  for (let i = 0; i < ids.length; ++i) {
    const playerid = ids[i]
    const pilot = pilots[playerid]

    ++pilot.tickcounter
    if (pilot.tickcounter % PILOT_TICK_INTERVAL !== 0) {
      continue
    }

    const board = memoryreadplayerboard(playerid)
    if (!ispresent(board)) {
      continue
    }

    const self = memoryreadobject(board, playerid)
    if (!ispresent(self) || !isnumber(self.x) || !isnumber(self.y)) {
      continue
    }

    const dx = pilot.targetx - self.x
    const dy = pilot.targety - self.y

    if (dx === 0 && dy === 0) {
      pilotnotify(
        vm,
        playerid,
        `[Pilot: arrived at (${pilot.targetx}, ${pilot.targety})]`,
      )
      delete pilots[playerid]
      continue
    }

    if (self.x === pilot.lastx && self.y === pilot.lasty) {
      ++pilot.stuckticks
      if (pilot.stuckticks >= PILOT_STUCK_THRESHOLD) {
        pilotnotify(
          vm,
          playerid,
          `[Pilot: stuck, could not reach (${pilot.targetx}, ${pilot.targety})]`,
        )
        delete pilots[playerid]
        continue
      }
    } else {
      pilot.stuckticks = 0
    }

    pilot.lastx = self.x
    pilot.lasty = self.y

    const frompt = { x: self.x, y: self.y }
    const topt = { x: pilot.targetx, y: pilot.targety }
    const nextpt = memoryreadboardpath(
      board,
      COLLISION.ISWALK,
      frompt,
      topt,
      false,
    )

    if (!ispresent(nextpt)) {
      continue
    }

    const ndx = nextpt.x - self.x
    const ndy = nextpt.y - self.y
    let input: INPUT = INPUT.NONE
    if (ndy < 0) {
      input = INPUT.MOVE_UP
    } else if (ndy > 0) {
      input = INPUT.MOVE_DOWN
    } else if (ndx < 0) {
      input = INPUT.MOVE_LEFT
    } else if (ndx > 0) {
      input = INPUT.MOVE_RIGHT
    }

    if (input === INPUT.NONE) {
      continue
    }

    if (!memoryhasflags(playerid)) {
      continue
    }

    const flags = memoryreadflags(playerid)
    if (!isarray(flags.inputqueue)) {
      flags.inputqueue = []
    }
    flags.inputqueue.push([input, 0])
  }
}
