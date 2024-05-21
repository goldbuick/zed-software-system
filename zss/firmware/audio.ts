import { createfirmware } from 'zss/firmware'
import { isstring } from 'zss/mapping/types'
import { memoryreadcontext } from 'zss/memory'

import { ARG_TYPE, readargs } from './wordtypes'

export const AUDIO_FIRMWARE = createfirmware({
  get() {
    return [false, undefined]
  },
  set() {
    return [false, undefined]
  },
  shouldtick() {},
  tick() {},
  tock() {},
}).command('play', (chip, words) => {
  const memory = memoryreadcontext(chip, words)
  const [buffer] = readargs(memory, 0, [ARG_TYPE.STRING])

  // see if we've been given a flag
  const maybebuffer = chip.get(buffer)
  if (isstring(maybebuffer)) {
    chip.emit('pcspeaker:play', [-1, maybebuffer])
  } else {
    chip.emit('pcspeaker:play', [-1, buffer])
  }

  return 0
})
