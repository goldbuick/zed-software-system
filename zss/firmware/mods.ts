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
  codepagereaddata,
  codepagereadtypetostring,
  codepagetypetostring,
  createcodepage,
} from 'zss/memory/codepage'

import { ARG_TYPE, readargs } from './wordtypes'

const COLOR_EDGE = '$dkpurple'

function write(text: string) {
  tape_info('mods', `${COLOR_EDGE}$blue${text}`)
}

function flush() {
  vm_flush('mods')
}

export const MODS_FIRMWARE = createfirmware({
  get() {
    return [false, undefined]
  },
  set() {
    return [false, undefined]
  },
  shouldtick() {},
  tick() {},
  tock() {},
}).command('mod', (chip, words) => {
  // book
  const backup = memoryreadchip(`${chip.id()}.backup`)
  const memory = memoryreadchip(chip.id())

  if (!ispresent(backup.book) && ispresent(memory.book)) {
    // backup context
    // this revert data is used when #mod self, or after #end of exec
    backup.book = memory.book
    backup.board = memory.board
    backup.object = memory.object
  }

  const [type, maybename] = readargs(memoryreadcontext(chip, words), 0, [
    ARG_TYPE.STRING,
    ARG_TYPE.MAYBE_STRING,
  ])

  function ensureopenbook() {
    memory.book = memory.book ?? createbook([])
  }

  function ensurecodepage<T extends CODE_PAGE_TYPE>(type: T, address: string) {
    // lookup by address
    let codepage = bookreadcodepagewithtype(memory.book, type, address)
    if (!ispresent(codepage)) {
      // create new codepage
      const typestr = codepagetypetostring(type)
      codepage = createcodepage(`@${typestr} ${address}\n`, {})
      if (ispresent(codepage)) {
        bookwritecodepage(memory.book, codepage)
        // message
        const pagetype = codepagereadtypetostring(codepage)
        write(`create [${pagetype}] ${address}`)
        flush() // tell register to save changes
      }
    }
    return codepage
  }

  switch (type) {
    case 'self':
      memory.book = backup.book
      memory.board = backup.board
      memory.object = backup.object
      break
    case 'book':
      // lookup by address
      memory.book = memoryreadbookbyaddress(maybename ?? '')

      // create new book
      if (!ispresent(memory.book)) {
        memory.book = createbook([])
        memorysetbook(memory.book)
        // message
        write(`created ${memory.book.name}`)
        flush() // tell register to save changes
      }
      break
    case CODE_PAGE_LABEL.BOARD as string:
      ensureopenbook()
      if (ispresent(memory.book)) {
        const address = maybename ?? createshortnameid()
        const codepage = ensurecodepage(CODE_PAGE_TYPE.BOARD, address)
        memory.board = codepage.board
      }
      break
    case CODE_PAGE_LABEL.OBJECT as string:
      ensureopenbook()
      if (ispresent(memory.book)) {
        const address = maybename ?? createshortnameid()
        const codepage = ensurecodepage(CODE_PAGE_TYPE.OBJECT, address)
        memory.object = codepage.object
      }
      break
    case CODE_PAGE_LABEL.TERRAIN as string:
      ensureopenbook()
      if (ispresent(memory.book)) {
        const address = maybename ?? createshortnameid()
        // lookup by address
        memory.terrain = codepagereaddata<CODE_PAGE_TYPE.TERRAIN>(
          bookreadcodepagewithtype(
            memory.book,
            CODE_PAGE_TYPE.TERRAIN,
            address,
          ),
        )
        // create new terrain
        if (!ispresent(memory.terrain)) {
          const codepage = createcodepage(`@terrain ${address}\n`, {})
          bookwritecodepage(memory.book, codepage)
          // message
          const pagetype = codepagereadtypetostring(codepage)
          write(`create [${pagetype}] ${address}`)
          flush() // tell register to save changes
        }
      }
      break
    case CODE_PAGE_LABEL.CHARSET as string:
      ensureopenbook()
      if (ispresent(memory.book)) {
        const address = maybename ?? createshortnameid()
        // lookup by address
        memory.charset = codepagereaddata<CODE_PAGE_TYPE.CHARSET>(
          bookreadcodepagewithtype(
            memory.book,
            CODE_PAGE_TYPE.CHARSET,
            address,
          ),
        )
        // create new charset
        if (!ispresent(memory.charset)) {
          const codepage = createcodepage(`@charset ${address}\n`, {})
          bookwritecodepage(memory.book, codepage)
          // message
          const pagetype = codepagereadtypetostring(codepage)
          write(`create [${pagetype}] ${address}`)
          flush() // tell register to save changes
        }
      }
      break
    case CODE_PAGE_LABEL.PALETTE as string:
      ensureopenbook()
      if (ispresent(memory.book)) {
        const address = maybename ?? createshortnameid()
        // lookup by address
        memory.palette = codepagereaddata<CODE_PAGE_TYPE.PALETTE>(
          bookreadcodepagewithtype(
            memory.book,
            CODE_PAGE_TYPE.PALETTE,
            address,
          ),
        )
        // create new palette
        if (!ispresent(memory.palette)) {
          const codepage = createcodepage(`@palette ${address}\n`, {})
          bookwritecodepage(memory.book, codepage)
          // message
          const pagetype = codepagereadtypetostring(codepage)
          write(`create [${pagetype}] ${address}`)
          flush() // tell register to save changes
        }
      }
      break
    case CODE_PAGE_LABEL.EIGHT_TRACK as string:
      ensureopenbook()
      if (ispresent(memory.book)) {
        const address = maybename ?? createshortnameid()
        // lookup by address
        memory.eighttrack = codepagereaddata<CODE_PAGE_TYPE.EIGHT_TRACK>(
          bookreadcodepagewithtype(
            memory.book,
            CODE_PAGE_TYPE.EIGHT_TRACK,
            address,
          ),
        )
        // create new eighttrack
        if (!ispresent(memory.eighttrack)) {
          const codepage = createcodepage(`@8track ${address}\n`, {})
          bookwritecodepage(memory.book, codepage)
          // message
          const pagetype = codepagereadtypetostring(codepage)
          write(`create [${pagetype}] ${address}`)
          flush() // tell register to save changes
        }
      }
      break
  }

  return 0
})
