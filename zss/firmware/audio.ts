import { CHIP } from 'zss/chip'
import { synth_play, synth_voice, synth_voicefx } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { isnumber, isstring } from 'zss/mapping/types'
import { ARG_TYPE, readargs } from 'zss/words/reader'
import { WORD } from 'zss/words/types'

const isfx = ['echo', 'reverb', 'chorus', 'phaser', 'distortion', 'vibrato']

function handlesynthplay(idx: number, chip: CHIP, words: WORD[]) {
  const [maybebuffer] = readargs(words, 0, [ARG_TYPE.MAYBE_STRING])
  // see if we've been given a flag
  const buffer = maybebuffer ?? ''
  const bufferfromflag = chip.get(buffer)
  // flip index -1 means play, 1 means bgplay
  synth_play('audio', -idx, isstring(bufferfromflag) ? bufferfromflag : buffer)
}

function handlesynthvoice(idx: number, words: WORD[]) {
  const [configorfx] = readargs(words, 0, [ARG_TYPE.MAYBE_NUMBER_OR_STRING])
  if (isnumber(configorfx)) {
    synth_voice('audio', idx, 'volume', configorfx)
  } else if (isfx.includes(configorfx.toLowerCase())) {
    const [maybeconfig, maybevalue] = readargs(words, 1, [
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    synth_voicefx('audio', idx, configorfx, maybeconfig, maybevalue)
  } else {
    const [maybevalue] = readargs(words, 1, [ARG_TYPE.MAYBE_NUMBER_OR_STRING])
    synth_voice('audio', idx, configorfx, maybevalue)
  }
}

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
    handlesynthplay(1, chip, words)
    return 0
  })
  .command('synth', (_, words) => {
    handlesynthvoice(1, words)
    return 0
  })
  .command('bgplay', (chip, words) => {
    handlesynthplay(-1, chip, words)
    return 0
  })
  .command('bgsynth', (_, words) => {
    handlesynthvoice(0, words)
    return 0
  })
