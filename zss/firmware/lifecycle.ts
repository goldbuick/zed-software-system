import { vm_logout } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memoryrun } from 'zss/memory'
import { bookboardsafedelete } from 'zss/memory/bookboard'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'

export const LIFECYCLE_FIRMWARE = createfirmware()
  .command('idle', (chip) => {
    chip.yield()
    return 0
  })
  .command('end', (chip) => {
    chip.endofprogram()
    return 0
  })
  .command('endwith', (chip, words) => {
    const [maybearg] = readargs(words, 0, [ARG_TYPE.ANY])
    chip.set('arg', maybearg)
    return chip.command('end')
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
    if (ispresent(READ_CONTEXT.element)) {
      // read cycle
      const [cyclevalue] = readargs(words, 0, [ARG_TYPE.NUMBER])
      // write cycle
      READ_CONTEXT.element.cycle = clamp(Math.round(cyclevalue), 1, 255)
    }
    return 0
  })
  .command('die', (chip) => {
    bookboardsafedelete(
      READ_CONTEXT.book,
      READ_CONTEXT.board,
      READ_CONTEXT.element,
      READ_CONTEXT.timestamp,
    )
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('endgame', () => {
    vm_logout(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('run', (_, words) => {
    const [func] = readargs(words, 0, [ARG_TYPE.NAME])
    memoryrun(func)
    return 0
  })
  .command('runwith', (chip, words) => {
    const [arg, func] = readargs(words, 0, [ARG_TYPE.ANY, ARG_TYPE.NAME])
    chip.set('arg', arg)
    memoryrun(func)
    return 0
  })
