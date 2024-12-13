import { synth_play, synth_voice, synth_voicefx } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { isstring } from 'zss/mapping/types'
import { ARG_TYPE, readargs } from 'zss/words/reader'
import { WORD } from 'zss/words/types'

const isfx = ['echo', 'reverb', 'chorus', 'phaser', 'distortion', 'vibrato']

function synthvoice(idx: number, words: WORD[]) {
  const [configorfx] = readargs(words, 0, [ARG_TYPE.STRING])
  if (isfx.includes(configorfx.toLowerCase())) {
    const [config, maybevalue] = readargs(words, 1, [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    synth_voicefx('audio', idx, configorfx, config, maybevalue)
  } else {
    const [value] = readargs(words, 1, [ARG_TYPE.MAYBE_NUMBER_OR_STRING])
    synth_voice('audio', idx, configorfx, value)
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
  .command('bgplay', (chip, words) => {
    const [maybebuffer] = readargs(words, 0, [ARG_TYPE.MAYBE_STRING])
    const buffer = maybebuffer ?? ''
    // see if we've been given a flag
    const bufferfromflag = chip.get(buffer)
    synth_play('audio', 1, isstring(bufferfromflag) ? bufferfromflag : buffer)
    return 0
  })
  .command('bgsynth', (_, words) => {
    synthvoice(0, words)
    return 0
  })
  .command('play', (chip, words) => {
    const [maybebuffer] = readargs(words, 0, [ARG_TYPE.MAYBE_STRING])
    const buffer = maybebuffer ?? ''
    // see if we've been given a flag
    const bufferfromflag = chip.get(buffer)
    synth_play('audio', -1, isstring(bufferfromflag) ? bufferfromflag : buffer)
    return 0
  })
  .command('synth', (_, words) => {
    synthvoice(1, words)
    return 0
  })
  .command('synth2', (_, words) => {
    synthvoice(2, words)
    return 0
  })
  .command('synth3', (_, words) => {
    synthvoice(3, words)
    return 0
  })
  .command('synth4', (_, words) => {
    synthvoice(4, words)
    return 0
  })
  .command('synth5', (_, words) => {
    synthvoice(5, words)
    return 0
  })
  .command('synth6', (_, words) => {
    synthvoice(6, words)
    return 0
  })
  .command('synth7', (_, words) => {
    synthvoice(7, words)
    return 0
  })
  .command('synth8', (_, words) => {
    synthvoice(8, words)
    return 0
  })
