import { createfirmware } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import {
  memorycreateeditframe,
  memorycreateviewframe,
  memoryreadchip,
  memoryreadcontext,
  memoryresetframes,
} from 'zss/memory'

import { ARG_TYPE, readargs } from './wordtypes'

export const BOARD_FIRMWARE = createfirmware({
  get() {
    return [false, undefined]
  },
  set() {
    return [false, undefined]
  },
  shouldtick() {},
  tick() {},
  tock() {},
}).command('frame', (chip, words) => {
  /*
  feel like I need to change to wording here ??

  what if we just did a simpler recursive system ???
  fg board, and bg board.

  and each of those can specify a fg / bg board

  */
  const memory = memoryreadchip(chip.id())
  const [maybetarget, maybetype, maybeboard] = readargs(
    memoryreadcontext(chip, words),
    0,
    [ARG_TYPE.STRING, ARG_TYPE.MAYBE_STRING, ARG_TYPE.MAYBE_STRING],
  )

  const board = memory.board?.id ?? ''

  const ltarget = maybetarget.toLowerCase()
  if (ltarget === 'reset') {
    memoryresetframes(board)
  } else if (ispresent(maybetype) && ispresent(maybeboard)) {
    const ltype = maybetype.toLowerCase()
    switch (ltype) {
      case 'edit':
        memorycreateeditframe(board, [ltarget], [maybeboard])
        break
      case 'view':
        memorycreateviewframe(board, [ltarget], [maybeboard])
        break
      default:
        // TODO raise error of unknown action
        break
    }
  }

  return 0
})
