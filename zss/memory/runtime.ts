import { objectKeys } from 'ts-extras'
import { MESSAGE, synthplay } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { ispid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { createos } from 'zss/os'
import { READ_CONTEXT } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

import { memoryreadobject } from './boardaccess'
import { memoryinitboard, memoryreadelementstat } from './boards'
import { memorytickboard } from './boardtick'
import { memoryreadcodepage } from './bookoperations'
import { memoryensuresoftwarebook } from './books'
import { memoryreadcodepagestats } from './codepageoperations'
import { memorypickcodepagewithtypeandstat } from './codepages'
import { memoryreadflags } from './flags'
import { memoryloaderarg } from './loader'
import {
  memoryreadbookplayerboards,
  memoryreadplayerboard,
} from './playermanagement'
import {
  memoryreadbookbysoftware,
  memoryreadloaders,
  memoryreadoperator,
} from './session'
import {
  memorymergesynthvoice,
  memorymergesynthvoicefx,
  memoryreadsynthplay,
} from './synthstate'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from './types'

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

const APPLY_SYNTH_RATE = Math.round(1.5 * TICK_FPS)

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
    if (timestamp % APPLY_SYNTH_RATE === 0) {
      memoryapplyboardsynthstats(board)
    }

    // iterate code needed to update given board
    const run = memorytickboard(board, timestamp)

    // draw pass
    for (let i = 0; i < run.length; ++i) {
      const { type, code, object, terrain, pass, label, id } = run[i]
      if (type !== CODE_PAGE_TYPE.ERROR && pass === 'draw') {
        memorytickonce(
          mainbook,
          board,
          object ?? terrain,
          code,
          id,
          label ?? '',
        )
      }
    }

    // update pass
    for (let i = 0; i < run.length; ++i) {
      const { id, type, code, object, pass } = run[i]
      if (pass === 'draw') {
        continue
      }
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

export function memorytickonce(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  code: string,
  id: string,
  label: string,
) {
  if (!ispresent(book) || !ispresent(board) || !ispresent(element)) {
    return
  }

  const OLD_CONTEXT: typeof READ_CONTEXT = { ...READ_CONTEXT }
  READ_CONTEXT.book = book
  READ_CONTEXT.board = board
  READ_CONTEXT.element = element
  READ_CONTEXT.elementid = element.id ?? ''
  READ_CONTEXT.elementisplayer = ispid(READ_CONTEXT.elementid)
  const playerfromelement = READ_CONTEXT.element.player ?? memoryreadoperator()
  READ_CONTEXT.elementfocus = READ_CONTEXT.elementisplayer
    ? READ_CONTEXT.elementid
    : playerfromelement

  READ_CONTEXT.usedisplaystats = true

  const itemname = NAME(element.name ?? element.kinddata?.name ?? '')
  os.once(id, DRIVER_TYPE.RUNTIME, itemname, code, label)

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
  os.once(id, DRIVER_TYPE.CLI, 'cli', cli, '')

  // track invoke
  if (tracking) {
    const flags = memoryreadflags(player)
    // track value of invoke
    flags.playbuffer = cli
  }
}

export function memoryruncodepage(address: string, label: string) {
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
  os.once(id, DRIVER_TYPE.RUNTIME, NAME(itemname), itemcode, label)

  // restore context
  objectKeys(OLD_CONTEXT).forEach((key) => {
    // @ts-expect-error dont bother me
    READ_CONTEXT[key] = OLD_CONTEXT[key]
  })
}

export function memoryunlockscroll(id: string, player: string) {
  os.scrollunlock(id, player)
}

function maptonumberorstring(arg: any) {
  const str = maptostring(arg)
  const value = parseFloat(maptostring(arg))
  return isNaN(value) ? str : value
}

function memoryapplysynthvoice(
  board: string,
  idx: number,
  statvalues: string[],
) {
  for (let i = 0; i < statvalues.length; ++i) {
    const statvalue = statvalues[i]
    if (isstring(statvalue)) {
      const [config, ...values] = statvalue.split(' ')
      const parsedconfig = maptostring(config)
      const parsedvalues = maptonumberorstring(values.join(' '))
      memorymergesynthvoice(board, idx, parsedconfig, parsedvalues || undefined)
    }
  }
}

function memoryapplysynthvoicefx(
  board: string,
  idx: number,
  statname: string,
  statvalues: string[],
) {
  for (let i = 0; i < statvalues.length; ++i) {
    const statvalue = statvalues[i]
    if (isstring(statvalue)) {
      const [config, ...values] = statvalue.split(' ')
      const parsedconfig = maptonumberorstring(config)
      const parsedvalues = maptonumberorstring(values.join(' '))
      memorymergesynthvoicefx(
        board,
        idx,
        statname,
        parsedconfig,
        parsedvalues || undefined,
      )
    }
  }
}

export function memoryapplyboardsynthstats(board: MAYBE<BOARD>) {
  const codepage = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.BOARD,
    board?.id ?? '',
  )
  if (!ispresent(codepage)) {
    return
  }

  const stats = memoryreadcodepagestats(codepage)
  const statnames = objectKeys(stats).filter((key) =>
    /^(synth\d?|autofilter\d?|autowah\d?|distortion\d?|echo\d?|fcrush\d?|reverb\d?|vibrato\d?)$/.test(
      key,
    ),
  )

  const boardid = board?.id ?? ''
  for (let i = 0; i < statnames.length; ++i) {
    const statname = NAME(statnames[i])
    const statvalues = (
      isarray(stats[statname]) ? stats[statname] : [stats[statname]]
    ) as string[]

    if (statname.startsWith('synth')) {
      const digit = statname.replace('synth', '')
      if (!digit) {
        // default to synth5
        for (let idx = 4; idx < 8; ++idx) {
          memoryapplysynthvoice(boardid, idx, statvalues)
        }
      } else {
        const idx = Number(digit)
        memoryapplysynthvoice(boardid, idx, statvalues)
      }
    } else {
      const fxnames = [
        'autofilter',
        'autowah',
        'distortion',
        'echo',
        'fcrush',
        'reverb',
        'vibrato',
      ]
      for (let i = 0; i < fxnames.length; ++i) {
        const fxname = fxnames[i]
        if (statname.startsWith(fxname)) {
          const digit = statname.replace(fxname, '')
          if (!digit) {
            memoryapplysynthvoicefx(boardid, 2, fxname, statvalues)
          } else {
            const idx = Number(digit)
            memoryapplysynthvoicefx(boardid, idx, fxname, statvalues)
          }
        }
      }
    }
  }
}
