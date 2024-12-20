import { maptostring } from 'zss/chip'
import { vm_endgame } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { clamp } from 'zss/mapping/number'
import { memoryrun } from 'zss/memory'
import { boardelementwritestat } from 'zss/memory/boardelement'
import {
  bookboardobjectnamedlookupdelete,
  bookboardobjectsafedelete,
} from 'zss/memory/book'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'

export const LIFECYCLE_FIRMWARE = createfirmware({
  get() {
    return [false, undefined]
  },
  set() {
    return [false, undefined]
  },
  shouldtick() {},
  tick() {},
  tock() {},
})
  .command('idle', (chip) => {
    chip.yield()
    return 0
  })
  .command('end', (chip) => {
    // future, this will also afford giving a return value #end <value>
    chip.endofprogram()
    return 0
  })
  .command('lock', (chip) => {
    chip.lock(chip.id())
    return 0
  })
  .command('restore', (chip, words) => {
    chip.restore(maptostring(words[0]))
    return 0
  })
  .command('unlock', (chip) => {
    chip.unlock()
    return 0
  })
  .command('zap', (chip, words) => {
    chip.zap(maptostring(words[0]))
    return 0
  })
  .command('cycle', (_, words) => {
    // read cycle
    const [cyclevalue] = readargs(words, 0, [ARG_TYPE.NUMBER])
    // write cycle
    const cycle = clamp(Math.round(cyclevalue), 1, 255)
    boardelementwritestat(READ_CONTEXT.element, 'cycle', cycle)
    return 0
  })
  .command('die', (chip) => {
    // drop from lookups if not headless
    if (READ_CONTEXT.element?.headless) {
      bookboardobjectnamedlookupdelete(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        READ_CONTEXT.element,
      )
    }
    // mark target for deletion
    bookboardobjectsafedelete(
      READ_CONTEXT.book,
      READ_CONTEXT.element,
      READ_CONTEXT.timestamp,
    )
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('endgame', () => {
    vm_endgame('element', READ_CONTEXT.player)
    return 0
  })
  .command('run', (_, words) => {
    const [func] = readargs(words, 0, [ARG_TYPE.STRING])
    memoryrun(func)
    return 0
  })
  .command('runwith', (_, words) => {
    const [func, value] = readargs(words, 0, [ARG_TYPE.STRING, ARG_TYPE.ANY])
    memoryrun(func, value)
    return 0
  })
