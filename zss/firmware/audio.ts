import { synth_play } from 'zss/device/api'
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
})
  .command('play', (chip, words) => {
    const memory = memoryreadcontext(chip, words)
    const [buffer] = readargs(memory, 0, [ARG_TYPE.STRING])
    // see if we've been given a flag
    const maybebuffer = chip.get(buffer)
    synth_play('audio', -1, isstring(maybebuffer) ? maybebuffer : buffer)
    return 0
  })
  .command('bgplay', (chip, words) => {
    const memory = memoryreadcontext(chip, words)
    const [buffer] = readargs(memory, 0, [ARG_TYPE.STRING])
    // see if we've been given a flag
    const maybebuffer = chip.get(buffer)
    synth_play('audio', 1, isstring(maybebuffer) ? maybebuffer : buffer)
    return 0
  })
