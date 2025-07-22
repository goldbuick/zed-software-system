import {
  bridge_mediastart,
  bridge_mediastop,
  bridge_talkstart,
  bridge_talkstop,
  synth_bgplay,
  synth_bgplayvolume,
  synth_bpm,
  synth_play,
  synth_playvolume,
  synth_tts,
  synth_ttsvolume,
  synth_voice,
  synth_voicefx,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { isnumber } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { NAME, WORD } from 'zss/words/types'

function handlesynthvoicefx(
  player: string,
  idx: number,
  fx: string,
  words: WORD[],
) {
  const [maybeconfig, maybevalue] = readargs(words, 0, [
    ARG_TYPE.NUMBER_OR_STRING,
    ARG_TYPE.MAYBE_NUMBER_OR_STRING,
  ])
  synth_voicefx(SOFTWARE, player, idx, fx, maybeconfig, maybevalue)
}

const isfx = [
  'echo',
  'reverb',
  'phaser',
  'distortion',
  'vibrato',
  'fc',
  'fcrush',
  'autowah',
]

function handlesynthvoice(player: string, idx: number, words: WORD[]) {
  const [voiceorfx, ii] = readargs(words, 0, [ARG_TYPE.NUMBER_OR_STRING])
  if (isnumber(voiceorfx)) {
    synth_voice(SOFTWARE, player, idx, 'volume', voiceorfx)
  } else if (isfx.includes(NAME(voiceorfx))) {
    const [maybeconfig, maybevalue] = readargs(words, ii, [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    synth_voicefx(SOFTWARE, player, idx, voiceorfx, maybeconfig, maybevalue)
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
      synth_voice(SOFTWARE, player, idx, voiceorfx, maybevalue)
    } else {
      const [maybevalue] = readargs(words, ii, [
        ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ])
      synth_voice(SOFTWARE, player, idx, voiceorfx, maybevalue)
    }
  }
}

let withvoice = 'en-US-GuyNeural'

function handlebgplay(words: WORD[], quantize: string) {
  const [buffer] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
  synth_bgplay(
    SOFTWARE,
    READ_CONTEXT.elementfocus,
    READ_CONTEXT.board?.id ?? '',
    buffer ?? '',
    quantize,
  )
}

export const AUDIO_FIRMWARE = createfirmware()
  .command('talk', (_, words) => {
    const [arg] = readargs(words, 0, [ARG_TYPE.ANY])
    switch (NAME(arg)) {
      default:
        bridge_talkstart(SOFTWARE, READ_CONTEXT.elementfocus)
        break
      case 'stop':
        bridge_talkstop(SOFTWARE, READ_CONTEXT.elementfocus)
        break
    }
    return 0
  })
  .command('media', (_, words) => {
    const [arg] = readargs(words, 0, [ARG_TYPE.ANY])
    switch (NAME(arg)) {
      default:
        bridge_mediastart(SOFTWARE, READ_CONTEXT.elementfocus)
        break
      case 'stop':
        bridge_mediastop(SOFTWARE, READ_CONTEXT.elementfocus)
        break
    }
    return 0
  })
  .command('tts', (_, words) => {
    const phrase = words.map(maptostring).join('')
    synth_tts(SOFTWARE, READ_CONTEXT.elementfocus, withvoice, phrase)
    return 0
  })
  .command('ttsvoice', (_, words) => {
    // https://github.com/lobehub/lobe-tts/blob/master/src/core/data/voiceList.ts
    withvoice = words.map(maptostring).join('')
    return 0
  })
  .command('bpm', (_, words) => {
    const [bpm] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synth_bpm(SOFTWARE, READ_CONTEXT.elementfocus, bpm)
    return 0
  })
  .command('vol', (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synth_playvolume(SOFTWARE, READ_CONTEXT.elementfocus, volume)
    return 0
  })
  .command('bgvol', (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synth_bgplayvolume(SOFTWARE, READ_CONTEXT.elementfocus, volume)
    return 0
  })
  .command('ttsvol', (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synth_ttsvolume(SOFTWARE, READ_CONTEXT.elementfocus, volume)
    return 0
  })
  .command('play', (_, words) => {
    const [buffer] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
    synth_play(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      buffer ?? '',
    )
    return 0
  })
  .command('bgplay', (_, words) => {
    handlebgplay(words, '')
    return 0
  })
  .command('bgplayon64n', (_, words) => {
    handlebgplay(words, '@64n')
    return 0
  })
  .command('bgplayon32n', (_, words) => {
    handlebgplay(words, '@32n')
    return 0
  })
  .command('bgplayon16n', (_, words) => {
    handlebgplay(words, '@16n')
    return 0
  })
  .command('bgplayon8n', (_, words) => {
    handlebgplay(words, '@8n')
    return 0
  })
  .command('bgplayon4n', (_, words) => {
    handlebgplay(words, '@4n')
    return 0
  })
  .command('bgplayon2n', (_, words) => {
    handlebgplay(words, '@2n')
    return 0
  })
  .command('bgplayon1n', (_, words) => {
    handlebgplay(words, '@1m')
    return 0
  })
  .command('synth', (_, words) => {
    for (let i = 0; i < 8; ++i) {
      handlesynthvoice(READ_CONTEXT.elementfocus, i, words)
    }
    return 0
  })
  .command('echo', (_, words) => {
    for (let i = 0; i < 3; ++i) {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'echo', words)
    }
    return 0
  })
  .command('fcrush', (_, words) => {
    for (let i = 0; i < 3; ++i) {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'fc', words)
    }
    return 0
  })
  .command('phaser', (_, words) => {
    for (let i = 0; i < 3; ++i) {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'phaser', words)
    }
    return 0
  })
  .command('reverb', (_, words) => {
    for (let i = 0; i < 3; ++i) {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'reverb', words)
    }
    return 0
  })
  .command('distort', (_, words) => {
    for (let i = 0; i < 3; ++i) {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'distort', words)
    }
    return 0
  })
  .command('vibrato', (_, words) => {
    for (let i = 0; i < 3; ++i) {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'vibrato', words)
    }
    return 0
  })
  .command('autowah', (_, words) => {
    for (let i = 0; i < 3; ++i) {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'autowah', words)
    }
    return 0
  })

// handle synth voices
for (let i = 0; i < 8; ++i) {
  AUDIO_FIRMWARE.command(`synth${i + 1}`, (_, words) => {
    handlesynthvoice(READ_CONTEXT.elementfocus, i, words)
    return 0
  })
}
// handle synth fx configurations
for (let i = 0; i < 3; ++i) {
  const idx = i + 1
  AUDIO_FIRMWARE.command(`echo${idx}`, (_, words) => {
    handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'echo', words)
    return 0
  })
    .command(`fcrush${idx}`, (_, words) => {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'fcrush', words)
      return 0
    })
    .command(`phaser${idx}`, (_, words) => {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'phaser', words)
      return 0
    })
    .command(`reverb${idx}`, (_, words) => {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'reverb', words)
      return 0
    })
    .command(`distort${idx}`, (_, words) => {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'distort', words)
      return 0
    })
    .command(`vibrato${idx}`, (_, words) => {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'vibrato', words)
      return 0
    })
    .command(`autowah${idx}`, (_, words) => {
      handlesynthvoicefx(READ_CONTEXT.elementfocus, i, 'autowah', words)
      return 0
    })
}
