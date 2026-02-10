import { objectKeys } from 'ts-extras'
import { MESSAGE, synthplay } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { ispid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { createos } from 'zss/os'
import { READ_CONTEXT } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

import { memoryreadobject, memorytickboard } from './boardoperations'
import { memoryreadcodepage } from './bookoperations'
import { memoryloaderarg } from './loader'
import {
  memoryreadbookplayerboards,
  memoryreadplayerboard,
} from './playermanagement'
import { memoryreadsynthplay } from './synthstate'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

import {
  memoryensuresoftwarebook,
  memoryinitboard,
  memoryreadbookbysoftware,
  memoryreadelementstat,
  memoryreadflags,
  memoryreadloaders,
  memoryreadoperator,
} from './index'

// manages chips
const os = createos()

export function memorygc() {
  os.gc()
}

export function memoryhaltchip(id: string) {
  os.halt(id)
}

export function memoryrestartallchipsandflags() {
  // stop all chips
  const ids = os.ids()
  for (let i = 0; i < ids.length; ++i) {
    os.halt(ids[i])
  }

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  // drop all flags from mainbook
  mainbook.flags = {}
}

export function memorymessagechip(message: MESSAGE) {
  os.message(message)
}
// CLI Operations

export function memoryrepeatclilast(player: string) {
  const flags = memoryreadflags(player)
  // setup as array of invokes
  const maybecli = (flags.playbuffer = isstring(flags.playbuffer)
    ? flags.playbuffer
    : '')
  // run it
  if (maybecli) {
    memoryruncli(player, maybecli, false)
  }
}

export function memorytickmain(playeronly = false) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  // inc timestamp
  const timestamp = mainbook.timestamp + 1

  // update loaders
  const loaders = memoryreadloaders()
  loaders.forEach((code, id) => {
    // cache context
    const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }

    // write context, all blank except for book and timestamp
    READ_CONTEXT.timestamp = mainbook.timestamp
    READ_CONTEXT.book = mainbook
    READ_CONTEXT.board = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.elementisplayer = false
    READ_CONTEXT.elementfocus = memoryreadoperator()

    // set chip
    const maybearg = memoryloaderarg(id)
    if (ispresent(maybearg)) {
      os.arg(id, maybearg)
    }

    // run code
    os.tick(id, DRIVER_TYPE.LOADER, 1, 'loader', code)

    // teardown on ended
    if (os.isended(id)) {
      os.halt(id)
      loaders.delete(id)
    }

    // restore context
    objectKeys(OLD_CONTEXT).forEach((key) => {
      // @ts-expect-error dont bother me
      READ_CONTEXT[key] = OLD_CONTEXT[key]
    })
  })

  // track tick
  mainbook.timestamp = timestamp
  READ_CONTEXT.timestamp = timestamp

  // update boards / build code / run chips
  const boards = memoryreadbookplayerboards(mainbook)
  for (let b = 0; b < boards.length; ++b) {
    const board = boards[b]
    // init kinds
    memoryinitboard(board)
    // iterate code needed to update given board
    const run = memorytickboard(board, timestamp)
    for (let i = 0; i < run.length; ++i) {
      const { id, type, code, object } = run[i]
      if (type === CODE_PAGE_TYPE.ERROR) {
        // handle dead code
        os.halt(id)
        // in dev, we only run player objects
      } else if (!playeronly || ispid(object?.id ?? '')) {
        // handle active code
        memorytickobject(mainbook, board, object, code)
      }
    }
    // process synth play queue
    const queue = memoryreadsynthplay(board.id)
    if (queue.length > 0) {
      const [play, endtime] = queue[0]
      const dec = endtime - 1
      if (play) {
        // dispatch play
        synthplay(SOFTWARE, '', board.id, play)
        console.info('play queue', board.id, play)
      }
      if (dec > 0) {
        queue[0] = ['', dec]
      } else {
        queue.shift()
      }
    }
  }
}

export function memorytickobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
  code: string,
) {
  if (!ispresent(book) || !ispresent(board) || !ispresent(object)) {
    return
  }

  // cache context
  const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }

  // write context
  READ_CONTEXT.book = book
  READ_CONTEXT.board = board
  READ_CONTEXT.element = object

  READ_CONTEXT.elementid = object.id ?? ''
  READ_CONTEXT.elementisplayer = ispid(READ_CONTEXT.elementid)

  const playerfromelement = READ_CONTEXT.element.player ?? memoryreadoperator()
  READ_CONTEXT.elementfocus = READ_CONTEXT.elementisplayer
    ? READ_CONTEXT.elementid
    : playerfromelement

  // read cycle
  const cycle = memoryreadelementstat(object, 'cycle')

  // run chip code
  const id = object.id ?? ''
  const itemname = NAME(object.name ?? object.kinddata?.name ?? '')
  os.tick(id, DRIVER_TYPE.RUNTIME, cycle, itemname, code)

  // clear ticker
  if (isnumber(object?.tickertime)) {
    // clear ticker text after X number of ticks
    if (READ_CONTEXT.timestamp - object.tickertime > TICK_FPS * 5) {
      object.tickertime = 0
      object.tickertext = ''
    }
  }

  // clear used input
  if (READ_CONTEXT.elementisplayer) {
    const flags = memoryreadflags(READ_CONTEXT.elementid)
    if (isnumber(flags.inputcurrent)) {
      flags.inputcurrent = 0
    }
  }

  // restore context
  objectKeys(OLD_CONTEXT).forEach((key) => {
    // @ts-expect-error dont bother me
    READ_CONTEXT[key] = OLD_CONTEXT[key]
  })
}

export function memoryruncli(player: string, cli: string, tracking = true) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  // player id + unique id fo run
  const id = `${player}_cli`

  // write context
  READ_CONTEXT.timestamp = mainbook.timestamp
  READ_CONTEXT.book = mainbook
  READ_CONTEXT.board = memoryreadplayerboard(player)
  READ_CONTEXT.element = memoryreadobject(READ_CONTEXT.board, player)
  READ_CONTEXT.elementid = READ_CONTEXT.element?.id ?? ''
  READ_CONTEXT.elementisplayer = true
  READ_CONTEXT.elementfocus = READ_CONTEXT.elementid || player

  // invoke once
  os.once(id, DRIVER_TYPE.CLI, 'cli', cli)

  // track invoke
  if (tracking) {
    const flags = memoryreadflags(player)
    // track value of invoke
    flags.playbuffer = cli
  }
}

export function memoryruncodepage(address: string) {
  // we assume READ_CONTEXT is setup correctly when this is run
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  const codepage = memoryreadcodepage(mainbook, address)
  if (!ispresent(mainbook) || !ispresent(codepage)) {
    return
  }

  // cache context
  const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }

  const id = `${address}_run`
  const itemname =
    READ_CONTEXT.element?.name ?? READ_CONTEXT.element?.kinddata?.name ?? ''
  const itemcode = codepage?.code ?? ''

  // set arg to value on chip with id = id
  os.once(id, DRIVER_TYPE.RUNTIME, NAME(itemname), itemcode)

  // restore context
  objectKeys(OLD_CONTEXT).forEach((key) => {
    // @ts-expect-error dont bother me
    READ_CONTEXT[key] = OLD_CONTEXT[key]
  })
}

export function memoryunlockscroll(id: string, player: string) {
  os.scrollunlock(id, player)
}
