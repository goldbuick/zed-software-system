import { parsetarget } from 'zss/device'
import { tape_info, vm_flush } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { createshortnameid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
import {
  memoryreadbookbyaddress,
  memoryreadchip,
  memoryreadcontext,
  memorysetbook,
} from 'zss/memory'
import {
  bookreadcodepagewithtype,
  bookwritecodepage,
  createbook,
} from 'zss/memory/book'
import {
  CODE_PAGE_LABEL,
  CODE_PAGE_TYPE,
  codepagereadtypetostring,
  codepagetypetostring,
  createcodepage,
} from 'zss/memory/codepage'

import { ensureopenbook } from './cli'
import { ARG_TYPE, readargs } from './wordtypes'

const COLOR_EDGE = '$dkpurple'

function write(text: string) {
  tape_info('mods', `${COLOR_EDGE}$blue${text}`)
}

function flush() {
  vm_flush('mods')
}

// track origin address for chip memory context
const MOD_ADDRESS = {
  ['self']: '',
  ['book']: '',
  [CODE_PAGE_LABEL.BOARD]: '',
  [CODE_PAGE_LABEL.OBJECT]: '',
  [CODE_PAGE_LABEL.TERRAIN]: '',
  [CODE_PAGE_LABEL.CHARSET]: '',
  [CODE_PAGE_LABEL.PALETTE]: '',
  [CODE_PAGE_LABEL.EIGHT_TRACK]: '',
}

export const MODS_FIRMWARE = createfirmware({
  get(_, name) {
    if (name.startsWith('mod:')) {
      const { path } = parsetarget(name)
      const value = MOD_ADDRESS[path as keyof typeof MOD_ADDRESS]
      return [true, value ?? '']
    }
    return [false, undefined]
  },
  set() {
    return [false, undefined]
  },
  shouldtick() {},
  tick() {},
  tock() {},
}).command('mod', (chip, words) => {
  const backup = memoryreadchip(`${chip.id()}.backup`)
  const memory = memoryreadchip(chip.id())

  // ensure open book
  memory.book = memory.book ?? ensureopenbook()
  if (!ispresent(memory.book)) {
    return 0
  }

  // backup context
  if (!ispresent(backup.book)) {
    // this revert data is used when #mod self, or after #end of exec
    backup.book = memory.book
    backup.board = memory.board
    backup.object = memory.object
    MOD_ADDRESS.book = ''
    MOD_ADDRESS.board = ''
    MOD_ADDRESS.object = 'self'
  }

  const [type, maybename] = readargs(memoryreadcontext(chip, words), 0, [
    ARG_TYPE.STRING,
    ARG_TYPE.MAYBE_STRING,
  ])

  function ensurecodepage<T extends CODE_PAGE_TYPE>(type: T, address: string) {
    // lookup by address
    let codepage = bookreadcodepagewithtype(memory.book, type, address)
    if (ispresent(codepage)) {
      // message
      const pagetype = codepagereadtypetostring(codepage)
      write(`modifying [${pagetype}] ${address}`)
      return codepage
    }

    // create new codepage
    const typestr = codepagetypetostring(type)
    codepage = createcodepage(
      typestr === 'object' ? `@${address}\n` : `@${typestr} ${address}\n`,
      {},
    )
    if (ispresent(codepage)) {
      bookwritecodepage(memory.book, codepage)
      // message
      const pagetype = codepagereadtypetostring(codepage)
      write(`created [${pagetype}] ${address}`)
      flush() // tell register to save changes
    }

    return codepage
  }

  const maybeaddress = maybename ?? ''
  const maybetype = type.toLowerCase()

  // book is a special case
  if (maybetype === 'book') {
    // lookup by address
    memory.book = memoryreadbookbyaddress(maybeaddress)
    if (ispresent(memory.book)) {
      // message
      write(`modifying [book] ${memory.book.name}`)
      MOD_ADDRESS.book = maybeaddress
    } else {
      // create new book
      memory.book = createbook([])
      memorysetbook(memory.book)
      // message
      write(`created [book] ${memory.book.name}`)
      flush() // tell register to save changes
      MOD_ADDRESS.book = memory.book.id
    }
    return 0
  }

  const withaddress = maybename ?? createshortnameid()
  switch (maybetype) {
    case 'self':
      memory.book = backup.book
      memory.board = backup.board
      memory.object = backup.object
      MOD_ADDRESS.book = ''
      MOD_ADDRESS.board = ''
      MOD_ADDRESS.object = 'self'
      break
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case CODE_PAGE_LABEL.LOADER: {
      ensurecodepage(CODE_PAGE_TYPE.LOADER, withaddress)
      break
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case CODE_PAGE_LABEL.BOARD: {
      const codepage = ensurecodepage(CODE_PAGE_TYPE.BOARD, withaddress)
      memory.board = codepage.board
      MOD_ADDRESS.board = codepage.id
      break
    }
    default: {
      const shortcut = type || createshortnameid()
      const codepage = ensurecodepage(CODE_PAGE_TYPE.OBJECT, shortcut)
      memory.object = codepage.object
      MOD_ADDRESS.object = codepage.id
      break
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case CODE_PAGE_LABEL.OBJECT: {
      const codepage = ensurecodepage(CODE_PAGE_TYPE.OBJECT, withaddress)
      memory.object = codepage.object
      MOD_ADDRESS.object = codepage.id
      break
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case CODE_PAGE_LABEL.TERRAIN: {
      const codepage = ensurecodepage(CODE_PAGE_TYPE.TERRAIN, withaddress)
      memory.terrain = codepage.terrain
      MOD_ADDRESS.terrain = codepage.id
      break
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case CODE_PAGE_LABEL.CHARSET: {
      const codepage = ensurecodepage(CODE_PAGE_TYPE.CHARSET, withaddress)
      memory.charset = codepage.charset
      MOD_ADDRESS.charset = codepage.id
      break
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case CODE_PAGE_LABEL.PALETTE: {
      const codepage = ensurecodepage(CODE_PAGE_TYPE.PALETTE, withaddress)
      memory.palette = codepage.palette
      MOD_ADDRESS.palette = codepage.id
      break
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case CODE_PAGE_LABEL.EIGHT_TRACK as string: {
      const codepage = ensurecodepage(CODE_PAGE_TYPE.EIGHT_TRACK, withaddress)
      memory.eighttrack = codepage.eighttrack
      MOD_ADDRESS.eighttrack = codepage.id
      break
    }
  }

  return 0
})
