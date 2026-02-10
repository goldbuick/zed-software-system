import { CHIP } from 'zss/chip'
import {
  synthbgplay,
  synthbgplayvolume,
  synthbpm,
  synthflush,
  synthplay,
  synthplayvolume,
  synthrecord,
  synthtts,
  synthttsclearqueue,
  synthttsengine,
  synthttsinfo,
  synthttsqueue,
  synthttsvolume,
  synthvoice,
  synthvoicefx,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import {
  memorymergesynthvoice,
  memorymergesynthvoicefx,
} from 'zss/memory/synthstate'
import { mapstrcategory } from 'zss/words/category'
import { mapstrcollision } from 'zss/words/collision'
import { mapstrcolor } from 'zss/words/color'
import { mapstrdir } from 'zss/words/dir'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { NAME, WORD } from 'zss/words/types'

function handlesynthvoicefx(
  player: string,
  board: string,
  idx: number,
  fx: string,
  words: WORD[],
) {
  const [maybeconfig, maybevalue] = readargs(words, 0, [
    ARG_TYPE.NUMBER_OR_STRING,
    ARG_TYPE.MAYBE_NUMBER_OR_STRING,
  ])
  synthvoicefx(SOFTWARE, player, board, idx, fx, maybeconfig, maybevalue)
  memorymergesynthvoicefx(board, idx, fx, maybeconfig, maybevalue)
}

const isfx = [
  'echo',
  'reverb',
  'autofilter',
  'distortion',
  'vibrato',
  'fc',
  'fcrush',
  'autowah',
]

function handlesynthvoice(
  player: string,
  board: string,
  idx: number,
  words: WORD[],
) {
  const [voiceorfx, ii] = readargs(words, 0, [ARG_TYPE.NUMBER_OR_STRING])
  if (isnumber(voiceorfx)) {
    synthvoice(SOFTWARE, player, board, idx, 'volume', voiceorfx)
    memorymergesynthvoice(board, idx, 'volume', voiceorfx)
  } else if (isfx.includes(NAME(voiceorfx))) {
    const [maybeconfig, maybevalue] = readargs(words, ii, [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
    ])
    synthvoicefx(
      SOFTWARE,
      player,
      board,
      idx,
      voiceorfx,
      maybeconfig,
      maybevalue,
    )
    memorymergesynthvoicefx(board, idx, voiceorfx, maybeconfig, maybevalue)
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
      synthvoice(SOFTWARE, player, board, idx, voiceorfx, maybevalue)
      memorymergesynthvoice(board, idx, voiceorfx, maybevalue)
    } else {
      const [maybevalue] = readargs(words, ii, [
        ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ])
      synthvoice(SOFTWARE, player, board, idx, voiceorfx, maybevalue)
      memorymergesynthvoice(board, idx, voiceorfx, maybevalue)
    }
  }
}

function handleplaystr(chip: CHIP, words: WORD[]) {
  const [buffer] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
  let withbuffer = ''
  if (isstring(buffer)) {
    const maybebuffer = chip.get(buffer)
    withbuffer =
      isstring(maybebuffer) &&
      !ispresent(mapstrcategory(maybebuffer)) &&
      !ispresent(mapstrcollision(maybebuffer)) &&
      !ispresent(mapstrcolor(maybebuffer)) &&
      !ispresent(mapstrdir(maybebuffer))
        ? maybebuffer
        : buffer
  }
  return withbuffer
}

function handlebgplay(chip: CHIP, words: WORD[], quantize: string) {
  synthbgplay(
    SOFTWARE,
    READ_CONTEXT.elementfocus,
    READ_CONTEXT.board?.id ?? '',
    handleplaystr(chip, words),
    quantize,
  )
}

export const AUDIO_FIRMWARE = createfirmware()
  .command('ttsengine', (_, words) => {
    const [engine, config] = readargs(words, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_STRING,
    ])
    synthttsengine(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      engine,
      config ?? '',
    )
    return 0
  })
  .command('tts', (_, words) => {
    const [voice, phrase] = readargs(words, 0, [
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_STRING,
    ])
    if (ispresent(voice) && ispresent(phrase)) {
      synthtts(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        voice,
        phrase,
      )
    } else if (isstring(voice)) {
      synthttsinfo(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        voice,
      )
    } else {
      synthttsclearqueue(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
      )
    }
    return 0
  })
  .command('ttsqueue', (_, words) => {
    const [voice, phrase] = readargs(words, 0, [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.STRING,
    ])
    synthttsqueue(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      voice,
      phrase,
    )
    return 0
  })
  .command('bpm', (_, words) => {
    const [bpm] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synthbpm(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      bpm,
    )
    return 0
  })
  .command('vol', (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synthplayvolume(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      volume,
    )
    return 0
  })
  .command('bgvol', (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synthbgplayvolume(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      volume,
    )
    return 0
  })
  .command('ttsvol', (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synthttsvolume(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      volume,
    )
    return 0
  })
  .command('play', (chip, words) => {
    synthplay(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      handleplaystr(chip, words),
    )
    return 0
  })
  .command('bgplay', (chip, words) => {
    handlebgplay(chip, words, '')
    return 0
  })
  .command('bgplayon64n', (chip, words) => {
    handlebgplay(chip, words, '@64n')
    return 0
  })
  .command('bgplayon32n', (chip, words) => {
    handlebgplay(chip, words, '@32n')
    return 0
  })
  .command('bgplayon16n', (chip, words) => {
    handlebgplay(chip, words, '@16n')
    return 0
  })
  .command('bgplayon8n', (chip, words) => {
    handlebgplay(chip, words, '@8n')
    return 0
  })
  .command('bgplayon4n', (chip, words) => {
    handlebgplay(chip, words, '@4n')
    return 0
  })
  .command('bgplayon2n', (chip, words) => {
    handlebgplay(chip, words, '@2n')
    return 0
  })
  .command('bgplayon1n', (chip, words) => {
    handlebgplay(chip, words, '@1m')
    return 0
  })
  .command('synth', (_, words) => {
    // multi-voice changes only apply to #play
    for (let i = 0; i < 4; ++i) {
      handlesynthvoice(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        i,
        words,
      )
    }
    return 0
  })
  .command('synthrecord', (_, words) => {
    const [filename] = readargs(words, 0, [ARG_TYPE.MAYBE_STRING])
    synthrecord(SOFTWARE, READ_CONTEXT.elementfocus, filename ?? '')
    return 0
  })
  .command('synthflush', () => {
    synthflush(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('echo', (_, words) => {
    // multi-voice changes only apply to #play
    for (let i = 0; i < 2; ++i) {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        i,
        'echo',
        words,
      )
    }
    return 0
  })
  .command('fcrush', (_, words) => {
    // multi-voice changes only apply to #play
    for (let i = 0; i < 2; ++i) {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        i,
        'fc',
        words,
      )
    }
    return 0
  })
  .command('autofilter', (_, words) => {
    // multi-voice changes only apply to #play
    for (let i = 0; i < 2; ++i) {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        i,
        'autofilter',
        words,
      )
    }
    return 0
  })
  .command('reverb', (_, words) => {
    // multi-voice changes only apply to #play
    for (let i = 0; i < 2; ++i) {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        i,
        'reverb',
        words,
      )
    }
    return 0
  })
  .command('distort', (_, words) => {
    // multi-voice changes only apply to #play
    for (let i = 0; i < 2; ++i) {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        i,
        'distort',
        words,
      )
    }
    return 0
  })
  .command('vibrato', (_, words) => {
    // multi-voice changes only apply to #play
    for (let i = 0; i < 2; ++i) {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        i,
        'vibrato',
        words,
      )
    }
    return 0
  })
  .command('autowah', (_, words) => {
    // multi-voice changes only apply to #play
    for (let i = 0; i < 2; ++i) {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        i,
        'autowah',
        words,
      )
    }
    return 0
  })

// handle individual synth voices
for (let i = 0; i < 4; ++i) {
  AUDIO_FIRMWARE.command(`synth${i + 1}`, (_, words) => {
    const bid = READ_CONTEXT.board?.id ?? ''
    handlesynthvoice(READ_CONTEXT.elementfocus, bid, i, words)
    return 0
  })
}

// handle bgplay synth voices
AUDIO_FIRMWARE.command('synth5', (_, words) => {
  // changes bgplay synth
  for (let i = 4; i < 8; ++i) {
    const bid = READ_CONTEXT.board?.id ?? ''
    handlesynthvoice(READ_CONTEXT.elementfocus, bid, i, words)
  }
  return 0
})

// handle synth fx configurations
for (let i = 0; i < 4; ++i) {
  const idx = i + 1
  AUDIO_FIRMWARE.command(`echo${idx}`, (_, words) => {
    const bid = READ_CONTEXT.board?.id ?? ''
    handlesynthvoicefx(READ_CONTEXT.elementfocus, bid, i, 'echo', words)
    return 0
  })
    .command(`fcrush${idx}`, (_, words) => {
      const bid = READ_CONTEXT.board?.id ?? ''
      handlesynthvoicefx(READ_CONTEXT.elementfocus, bid, i, 'fcrush', words)
      return 0
    })
    .command(`autofilter${idx}`, (_, words) => {
      const bid = READ_CONTEXT.board?.id ?? ''
      handlesynthvoicefx(READ_CONTEXT.elementfocus, bid, i, 'autofilter', words)
      return 0
    })
    .command(`reverb${idx}`, (_, words) => {
      const bid = READ_CONTEXT.board?.id ?? ''
      handlesynthvoicefx(READ_CONTEXT.elementfocus, bid, i, 'reverb', words)
      return 0
    })
    .command(`distort${idx}`, (_, words) => {
      const bid = READ_CONTEXT.board?.id ?? ''
      handlesynthvoicefx(READ_CONTEXT.elementfocus, bid, i, 'distort', words)
      return 0
    })
    .command(`vibrato${idx}`, (_, words) => {
      const bid = READ_CONTEXT.board?.id ?? ''
      handlesynthvoicefx(READ_CONTEXT.elementfocus, bid, i, 'vibrato', words)
      return 0
    })
    .command(`autowah${idx}`, (_, words) => {
      const bid = READ_CONTEXT.board?.id ?? ''
      handlesynthvoicefx(READ_CONTEXT.elementfocus, bid, i, 'autowah', words)
      return 0
    })
}
