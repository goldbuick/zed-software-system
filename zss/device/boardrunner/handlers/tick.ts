import type { DEVICE } from 'zss/device'
import {
  type MESSAGE,
  vmboardrunneraccess,
  vmboardrunnerack,
  vmboardrunnerpaint,
  workstatus,
} from 'zss/device/api'
import {
  BOUNDARY_DOC,
  assignedboundaries,
  incfirsttick,
  incmemorysyncaccess,
  memorysyncaccess,
  playersonassignedboard,
  readfirsttick,
  readworkerboundarypipe,
  resetfirsttick,
} from 'zss/device/boardrunner/state'
import { pushworkerupdates, waitformemory } from 'zss/device/boardrunner/sync'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'
import { memoryreadoverboard, memoryreadunderboard } from 'zss/memory/boards'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memorycollectboundaryidsforboard } from 'zss/memory/boundaryrouting'
import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
import {
  memoryreadgadgetlayers,
  memoryreadgraphics,
} from 'zss/memory/rendering'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadassignedboard,
  memoryreadboardrunner,
  memoryreadbookbysoftware,
  memoryreadhalt,
  memorywriteassignedboard,
} from 'zss/memory/session'
import { BOARD, MEMORY_LABEL } from 'zss/memory/types'

export function handletick(device: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [board, timestamp, boundaries] = message.data as [
    string,
    number,
    string[],
  ]
  const runner = memoryreadboardrunner()
  const priorboard = memoryreadassignedboard()

  // update the assigned board
  if (priorboard !== board) {
    workstatus(device, runner, `run ${board}`)
    memorywriteassignedboard(board)
    assignedboundaries.clear()
    resetfirsttick()
  }

  // force desync if we are assigned to a boundary that is not in the list
  for (const id of boundaries) {
    if (assignedboundaries.has(id)) {
      continue
    }
    assignedboundaries.add(id)
    readworkerboundarypipe(id).forcedesync()
    device.reply(message, 'desync', id)
  }

  // acknowledge the tick so we don't get booted as runner
  vmboardrunnerack(device, runner)

  // always update the timestamp
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (ispresent(mainbook)) {
    mainbook.timestamp = timestamp
  }

  // wait if we are not ready to tick
  if (waitformemory()) {
    resetfirsttick()
    if (memorysyncaccess % 8 === 0) {
      device.reply(message, 'desync')
    }
    incmemorysyncaccess()
    return
  }

  // wait if we are desynced
  for (const id of assignedboundaries.values()) {
    if (readworkerboundarypipe(id).isdesynced()) {
      resetfirsttick()
      return
    }
  }

  // lookup the board we are assigned to
  const assignedboard = memoryreadassignedboard()
  const boundary = memoryboundaryget<BOUNDARY_DOC>(assignedboard)
  const maybeboard: MAYBE<BOARD> = boundary?.board
  if (!ispresent(maybeboard)) {
    return
  }

  const maybeunderboard = memoryreadunderboard(maybeboard)
  const maybeoverboard = memoryreadoverboard(maybeboard)

  // gather boards that we need to DISPLAY
  const waitforvisualboards: BOARD[] = [maybeunderboard, maybeoverboard]
    .filter(ispresent)
    .filter((b) => !assignedboundaries.has(b.id))
  if (waitforvisualboards.length > 0) {
    for (const b of waitforvisualboards) {
      vmboardrunneraccess(device, runner, assignedboard, b.id)
    }
    return
  }

  // temp logging to know we are ticking
  const tickcount = readfirsttick()
  if (tickcount < 50) {
    if (tickcount % 10 === 0) {
      console.info(`${self.name} $$$ TICKING\n${runner} -> ${assignedboard}`)
    }
    incfirsttick()
  }

  // list of boards that we need to TICK
  const updateboards: BOARD[] = [maybeboard, maybeoverboard].filter(ispresent)
  memorytickmain(timestamp, updateboards, memoryreadhalt())

  // cover the case where the boardrunner creates new flags / boundaries
  for (const b of updateboards) {
    const ids = memorycollectboundaryidsforboard(mainbook, b)
    for (const id of ids) {
      if (!assignedboundaries.has(id)) {
        assignedboundaries.add(id)
        const doc = memoryboundaryget(id)
        if (ispresent(doc)) {
          vmboardrunnerpaint(device, runner, doc, id)
        }
      }
    }
  }

  // gather players that we are in charge of running
  playersonassignedboard.clear()
  const boardplayers = memoryreadplayersonboard(maybeboard)
  for (let p = 0; p < boardplayers.length; ++p) {
    playersonassignedboard.add(boardplayers[p])
  }

  // build the gadget layers for the board we are in charge of DISPLAYING
  const didrender: Record<string, boolean> = {}
  // read the players on the board
  const players = memoryreadplayersonboard(maybeboard)
  // read the gadget layers for the board
  const store = memoryreadbookgadgetlayersforboard(mainbook, maybeboard.id)
  for (let p = 0; p < players.length; ++p) {
    // read the graphics for the player
    const { graphics } = memoryreadgraphics(players[p], maybeboard)
    const mode = normalizelayerzvariant(graphics)
    // if we haven't rendered this mode yet, render it
    if (!ispresent(didrender[mode])) {
      didrender[mode] = true
      store[mode] = memoryreadgadgetlayers(mode, maybeboard)
    }
  }

  pushworkerupdates(device)
}
