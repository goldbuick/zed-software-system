import { synth_play } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { isstring } from 'zss/mapping/types'

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
    const [maybebuffer] = readargs(words, 0, [ARG_TYPE.MAYBE_STRING])
    const buffer = maybebuffer ?? ''
    // see if we've been given a flag
    const bufferfromflag = chip.get(buffer)
    synth_play('audio', -1, isstring(bufferfromflag) ? bufferfromflag : buffer)
    return 0
  })
  .command('bgplay', (chip, words) => {
    const [maybebuffer] = readargs(words, 0, [ARG_TYPE.MAYBE_STRING])
    const buffer = maybebuffer ?? ''
    // see if we've been given a flag
    const bufferfromflag = chip.get(buffer)
    synth_play('audio', 1, isstring(bufferfromflag) ? bufferfromflag : buffer)
    return 0
  })
