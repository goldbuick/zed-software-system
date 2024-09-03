import { createfirmware } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import {
  memoryreadbooksbytags,
  memoryreadchip,
  memoryreadcontext,
} from 'zss/memory'
import { bookreadcodepagewithtype } from 'zss/memory/book'
import {
  CODE_PAGE_LABEL,
  CODE_PAGE_TYPE,
  codepagereaddata,
} from 'zss/memory/codepage'

import { ARG_TYPE, readargs } from './wordtypes'

export const MODS_FIRMWARE = createfirmware({
  get(chip, name) {
    return [false, undefined]
  },
  set(chip, name, value) {
    return [false, undefined]
  },
  shouldtick(chip, activecycle) {
    //
  },
  tick(chip) {
    //
  },
  tock(chip) {
    //
  },
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

  const [maybetype, maybename] = readargs(memoryreadcontext(chip, words), 0, [
    ARG_TYPE.STRING,
    ARG_TYPE.MAYBE_STRING,
  ])

  const hastype = ispresent(maybename)
  const type = hastype ? maybetype : 'object'
  const name = hastype ? maybename : maybetype

  switch (type as CODE_PAGE_LABEL) {
    case 'self' as CODE_PAGE_LABEL:
      memory.book = backup.book
      memory.board = backup.board
      memory.object = backup.object
      break
    case 'book' as CODE_PAGE_LABEL: {
      const [maybebook] = memoryreadbooksbytags([name])
      if (ispresent(maybebook)) {
        memory.book = maybebook
      }
      break
    }
    case CODE_PAGE_LABEL.BOARD:
      if (ispresent(memory.book)) {
        const maybecodepage = bookreadcodepagewithtype(
          memory.book,
          CODE_PAGE_TYPE.BOARD,
          name,
        )
        const data = codepagereaddata<CODE_PAGE_TYPE.BOARD>(maybecodepage)
        if (ispresent(data)) {
          memory.board = data
        }
      }
      break
    case CODE_PAGE_LABEL.OBJECT:
      if (ispresent(memory.book)) {
        const maybecodepage = bookreadcodepagewithtype(
          memory.book,
          CODE_PAGE_TYPE.OBJECT,
          name,
        )
        const data = codepagereaddata<CODE_PAGE_TYPE.OBJECT>(maybecodepage)
        if (ispresent(data)) {
          memory.object = data
        }
      }
      break
    case CODE_PAGE_LABEL.TERRAIN:
      if (ispresent(memory.book)) {
        const maybecodepage = bookreadcodepagewithtype(
          memory.book,
          CODE_PAGE_TYPE.TERRAIN,
          name,
        )
        const data = codepagereaddata<CODE_PAGE_TYPE.TERRAIN>(maybecodepage)
        if (ispresent(data)) {
          memory.terrain = data
        }
      }
      break
    case CODE_PAGE_LABEL.CHARSET:
      if (ispresent(memory.book)) {
        const maybecodepage = bookreadcodepagewithtype(
          memory.book,
          CODE_PAGE_TYPE.CHARSET,
          name,
        )
        const data = codepagereaddata<CODE_PAGE_TYPE.CHARSET>(maybecodepage)
        if (ispresent(data)) {
          memory.charset = data
        }
      }
      break
    case CODE_PAGE_LABEL.PALETTE:
      if (ispresent(memory.book)) {
        const maybecodepage = bookreadcodepagewithtype(
          memory.book,
          CODE_PAGE_TYPE.PALETTE,
          name,
        )
        const data = codepagereaddata<CODE_PAGE_TYPE.PALETTE>(maybecodepage)
        if (ispresent(data)) {
          memory.palette = data
        }
      }
      break
    case CODE_PAGE_LABEL.EIGHT_TRACK:
      if (ispresent(memory.book)) {
        const maybecodepage = bookreadcodepagewithtype(
          memory.book,
          CODE_PAGE_TYPE.EIGHT_TRACK,
          name,
        )
        const data = codepagereaddata<CODE_PAGE_TYPE.EIGHT_TRACK>(maybecodepage)
        if (ispresent(data)) {
          memory.eighttrack = data
        }
      }
      break
  }

  return 0
})
