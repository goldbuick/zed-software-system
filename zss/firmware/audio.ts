import {
  synth_bpm,
  synth_bgplayvolume,
  synth_playvolume,
  synth_play,
  synth_tta,
  synth_tts,
  synth_ttsvolume,
  synth_voice,
  synth_voicefx,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { isnumber } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { ARG_TYPE, readargs } from 'zss/words/reader'
import { NAME, WORD } from 'zss/words/types'

const isfx = [
  'echo',
  'reverb',
  'chorus',
  'phaser',
  'distortion',
  'vibrato',
  'fc',
]

function handlesynthplay(words: WORD[], bgplay: boolean) {
  const [buffer] = readargs(words, 0, [ARG_TYPE.NAME])
  synth_play(SOFTWARE, buffer, bgplay)
}

function handlesynthvoice(idx: number, words: WORD[]) {
  const [voiceorfx, ii] = readargs(words, 0, [ARG_TYPE.NUMBER_OR_STRING])
  if (isnumber(voiceorfx)) {
    synth_voice(SOFTWARE, idx, 'volume', voiceorfx)
  } else if (isfx.includes(NAME(voiceorfx))) {
    const [maybeconfig, maybevalue] = readargs(words, ii, [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    synth_voicefx(SOFTWARE, idx, voiceorfx, maybeconfig, maybevalue)
  } else {
    // check for a list of numbers
    const [configorpartials] = readargs(words, ii, [
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    if (isnumber(configorpartials)) {
      const count = words.length - ii
      const argtypes = new Array<ARG_TYPE>(count).fill(ARG_TYPE.NUMBER)
      // @ts-expect-error argtypes ?
      const partials = readargs(words, ii, argtypes).slice(0, count)
      const maybevalue = partials.length === 1 ? partials[0] : partials
      synth_voice(SOFTWARE, idx, voiceorfx, maybevalue)
    } else {
      const [maybevalue] = readargs(words, ii, [
        ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ])
      synth_voice(SOFTWARE, idx, voiceorfx, maybevalue)
    }
  }
}

export const AUDIO_FIRMWARE = createfirmware()
  .command('tts', (_, words) => {
    const [voice, ii] = readargs(words, 0, [ARG_TYPE.STRING])
    const phrase = words.slice(ii).map(maptostring).join('')
    synth_tts(SOFTWARE, voice, phrase)
    // https://github.com/lobehub/lobe-tts/blob/master/src/core/data/voiceList.ts
    return 0
  })
  .command('tta', (_, words) => {
    const phrase = words.map(maptostring).join('')
    synth_tta(SOFTWARE, phrase)
    // https://huggingface.co/spaces/fantaxy/Sound-AI-SFX
    return 0
  })
  .command('bpm', (_, words) => {
    const [bpm] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synth_bpm(SOFTWARE, bpm)
    return 0
  })
  .command('vol', (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synth_playvolume(SOFTWARE, volume)
    return 0
  })
  .command('bgvol', (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synth_bgplayvolume(SOFTWARE, volume)
    return 0
  })
  .command('ttsvol', (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synth_ttsvolume(SOFTWARE, volume)
    return 0
  })
  .command('play', (_, words) => {
    handlesynthplay(words, false)
    return 0
  })
  .command('bgplay', (_, words) => {
    handlesynthplay(words, true)
    return 0
  })
  .command('synth', (_, words) => {
    for (let i = 0; i < 8; ++i) {
      handlesynthvoice(i, words)
    }
    return 0
  })
  .command('synth1', (_, words) => {
    handlesynthvoice(0, words)
    return 0
  })
  .command('synth2', (_, words) => {
    handlesynthvoice(1, words)
    return 0
  })
  .command('synth3', (_, words) => {
    handlesynthvoice(2, words)
    return 0
  })
  .command('synth4', (_, words) => {
    handlesynthvoice(3, words)
    return 0
  })
  .command('synth5', (_, words) => {
    handlesynthvoice(4, words)
    return 0
  })
  .command('synth6', (_, words) => {
    handlesynthvoice(5, words)
    return 0
  })
  .command('synth7', (_, words) => {
    handlesynthvoice(6, words)
    return 0
  })
  .command('synth8', (_, words) => {
    handlesynthvoice(7, words)
    return 0
  })
