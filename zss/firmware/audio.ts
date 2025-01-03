import { CHIP } from 'zss/chip'
import {
  synth_play,
  synth_tts,
  synth_voice,
  synth_voicefx,
} from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { isnumber, isstring } from 'zss/mapping/types'
import { ARG_TYPE, readargs } from 'zss/words/reader'
import { NAME, WORD } from 'zss/words/types'

const isfx = ['echo', 'reverb', 'chorus', 'phaser', 'distortion', 'vibrato']

function handlesynthplay(idx: number, chip: CHIP, words: WORD[]) {
  const [maybebuffer] = readargs(words, 0, [ARG_TYPE.MAYBE_STRING])
  // see if we've been given a flag
  const buffer = maybebuffer ?? ''
  const bufferfromflag = chip.get(buffer)
  // index 1 means play, 0 means bgplay
  synth_play('audio', idx, isstring(bufferfromflag) ? bufferfromflag : buffer)
}

function handlesynthvoice(idx: number, words: WORD[]) {
  const [voiceorfx] = readargs(words, 0, [ARG_TYPE.NUMBER_OR_STRING])
  if (isnumber(voiceorfx)) {
    synth_voice('audio', idx, 'volume', voiceorfx)
  } else if (isfx.includes(NAME(voiceorfx))) {
    const [maybeconfig, maybevalue] = readargs(words, 1, [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    synth_voicefx('audio', idx, voiceorfx, maybeconfig, maybevalue)
  } else {
    // check for a list of numbers
    const [configorpartials] = readargs(words, 1, [
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    if (isnumber(configorpartials)) {
      const count = words.length - 1
      const argtypes = new Array<ARG_TYPE>(count).fill(ARG_TYPE.NUMBER)
      // @ts-expect-error argtypes ?
      const partials = readargs(words, 1, argtypes).slice(0, count)
      const maybevalue = partials.length === 1 ? partials[0] : partials
      synth_voice('audio', idx, voiceorfx, maybevalue)
    } else {
      const [maybevalue] = readargs(words, 1, [ARG_TYPE.MAYBE_NUMBER_OR_STRING])
      synth_voice('audio', idx, voiceorfx, maybevalue)
    }
  }
}

export const AUDIO_FIRMWARE = createfirmware()
  .command('play', (chip, words) => {
    handlesynthplay(1, chip, words)
    return 0
  })
  .command('synth', (_, words) => {
    for (let i = 1; i <= 8; ++i) {
      handlesynthvoice(i, words)
    }
    return 0
  })
  .command('synth1', (_, words) => {
    handlesynthvoice(1, words)
    return 0
  })
  .command('synth2', (_, words) => {
    handlesynthvoice(2, words)
    return 0
  })
  .command('synth3', (_, words) => {
    handlesynthvoice(3, words)
    return 0
  })
  .command('synth4', (_, words) => {
    handlesynthvoice(4, words)
    return 0
  })
  .command('synth5', (_, words) => {
    handlesynthvoice(5, words)
    return 0
  })
  .command('synth6', (_, words) => {
    handlesynthvoice(6, words)
    return 0
  })
  .command('synth7', (_, words) => {
    handlesynthvoice(7, words)
    return 0
  })
  .command('synth8', (_, words) => {
    handlesynthvoice(8, words)
    return 0
  })
  .command('bgplay', (chip, words) => {
    handlesynthplay(0, chip, words)
    return 0
  })
  .command('bgsynth', (_, words) => {
    handlesynthvoice(0, words)
    return 0
  })
  .command('tts', (_, words) => {
    const [phrase, voice] = readargs(words, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_STRING,
    ])
    synth_tts('audio', voice ?? '', phrase)
    // https://github.com/lobehub/lobe-tts/blob/master/src/core/data/voiceList.ts
    return 0
  })
