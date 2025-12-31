import { objectKeys } from 'ts-extras'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { ispresent, isstring } from 'zss/mapping/types'
import { createos } from 'zss/os'
import { READ_CONTEXT } from 'zss/words/reader'
import { NAME } from 'zss/words/types'

import { memoryreadobject } from './boardoperations'
import { memoryreadcodepage } from './bookoperations'
import { memoryreadplayerboard } from './playermanagement'
import { MEMORY_LABEL } from './types'

import {
  memoryensuresoftwarebook,
  memoryreadbookbysoftware,
  memoryreadflags,
  memoryreadloaders,
} from './index'

// manages chips
const os = createos()

// CLI Operations

export function memorycleanup() {
  os.gc()
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

export function memoryresetchipafteredit(object: string) {
  os.halt(object)
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

export function memorystartloader(id: string, code: string) {
  const loaders = memoryreadloaders()
  loaders.set(id, code)
}
