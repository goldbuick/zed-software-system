import { CHIP } from 'zss/chip'
import {
  synthbgplay,
  synthbgplayvolume,
  synthflush,
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
import { write } from 'zss/feature/writeui'
import { createfirmware } from 'zss/firmware'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import {
  memorymergesynthvoice,
  memorymergesynthvoicefx,
  memoryqueuesynthplay,
} from 'zss/memory/synthstate'
import { mapstrcategory } from 'zss/words/category'
import { mapstrcollision } from 'zss/words/collision'
import { mapstrcolor } from 'zss/words/color'
import { mapstrdir } from 'zss/words/dir'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME, WORD } from 'zss/words/types'

/** Inlined desc for dynamically named audio commands (synth1–5, echo1–4, fcrush1–4, etc.). */
const AUDIO_CMD_DESC: Record<string, string> = {
  synth1: 'synth voice 1',
  synth2: 'synth voice 2',
  synth3: 'synth voice 3',
  synth4: 'synth voice 4',
  synth5: '#bgplay synth voices',
  echo1: 'for first 2 channels of #play',
  echo2: 'for last 2 channels of #play',
  echo3: 'for #bgplay',
  echo4: 'for #tts',
  fcrush1: 'crush for first 2 channels of #play',
  fcrush2: 'crush for last 2 channels of #play',
  fcrush3: 'crush for #bgplay',
  fcrush4: 'crush for #tts',
  autofilter1: 'for first 2 channels of #play',
  autofilter2: 'for last 2 channels of #play',
  autofilter3: 'for #bgplay',
  autofilter4: 'for #tts',
  reverb1: 'for first 2 channels of #play',
  reverb2: 'for last 2 channels of #play',
  reverb3: 'for #bgplay',
  reverb4: 'for #tts',
  distort1: 'for first 2 channels of #play',
  distort2: 'for last 2 channels of #play',
  distort3: 'for #bgplay',
  distort4: 'for #tts',
  vibrato1: 'for first 2 channels of #play',
  vibrato2: 'for last 2 channels of #play',
  vibrato3: 'for #bgplay',
  vibrato4: 'for #tts',
  autowah1: 'for first 2 channels of #play',
  autowah2: 'for last 2 channels of #play',
  autowah3: 'for #bgplay',
  autowah4: 'for #tts',
}

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
  .command(
    'ttsengine',
    [
      ARG_TYPE.MAYBE_STRING,
      ARG_TYPE.MAYBE_STRING,
      'TTS engine and config (no args: list engines)',
    ],
    (_, words) => {
      const [engine, config] = readargs(words, 0, [
        ARG_TYPE.MAYBE_STRING,
        ARG_TYPE.MAYBE_STRING,
      ])
      if (!ispresent(engine)) {
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          'TTS engines: piper, supertonic',
        )
        return 0
      }
      synthttsengine(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        engine,
        config ?? '',
      )
      return 0
    },
  )
  .command(
    'tts',
    [
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_STRING,
      'text with voice (or clear queue)',
    ],
    (_, words) => {
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
    },
  )
  .command(
    'ttsqueue',
    [ARG_TYPE.NUMBER_OR_STRING, ARG_TYPE.STRING, 'TTS phrase'],
    (_, words) => {
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
    },
  )
  .command('vol', [ARG_TYPE.NUMBER, 'main volume'], (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synthplayvolume(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      volume,
    )
    return 0
  })
  .command('bgvol', [ARG_TYPE.NUMBER, 'bgplay volume'], (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synthbgplayvolume(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      volume,
    )
    return 0
  })
  .command('ttsvol', [ARG_TYPE.NUMBER, 'TTS volume'], (_, words) => {
    const [volume] = readargs(words, 0, [ARG_TYPE.NUMBER])
    synthttsvolume(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      READ_CONTEXT.board?.id ?? '',
      volume,
    )
    return 0
  })
  .command('play', [ARG_TYPE.MAYBE_NAME, 'music notes'], (chip, words) => {
    memoryqueuesynthplay(
      READ_CONTEXT.board?.id ?? '',
      handleplaystr(chip, words),
    )
    return 0
  })
  .command(
    'bgplay',
    [ARG_TYPE.MAYBE_NAME, '#play but for sound effects'],
    (chip, words) => {
      handlebgplay(chip, words, '')
      return 0
    },
  )
  .command('bgplayon64n', ['bgplay on 64n'], (chip, words) => {
    handlebgplay(chip, words, '@64n')
    return 0
  })
  .command('bgplayon32n', ['bgplay on 32n'], (chip, words) => {
    handlebgplay(chip, words, '@32n')
    return 0
  })
  .command('bgplayon16n', ['bgplay on 16n'], (chip, words) => {
    handlebgplay(chip, words, '@16n')
    return 0
  })
  .command('bgplayon8n', ['bgplay on 8n'], (chip, words) => {
    handlebgplay(chip, words, '@8n')
    return 0
  })
  .command('bgplayon4n', ['bgplay on 4n'], (chip, words) => {
    handlebgplay(chip, words, '@4n')
    return 0
  })
  .command('bgplayon2n', ['bgplay on 2n'], (chip, words) => {
    handlebgplay(chip, words, '@2n')
    return 0
  })
  .command('bgplayon1n', ['bgplay on 1n'], (chip, words) => {
    handlebgplay(chip, words, '@1m')
    return 0
  })
  .command('synth', ['all 4 channels of #play synth voices'], (_, words) => {
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
  .command(
    'synthrecord',
    [ARG_TYPE.MAYBE_STRING, 'played note buffer to an mp3 file'],
    (_, words) => {
      const [filename] = readargs(words, 0, [ARG_TYPE.MAYBE_STRING])
      synthrecord(SOFTWARE, READ_CONTEXT.elementfocus, filename ?? '')
      return 0
    },
  )
  .command('synthflush', ['buffer of played notes'], () => {
    synthflush(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command(
    'echo',
    [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      'echo effect to all 4 channels of #play',
    ],
    (_, words) => {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        0,
        'echo',
        words,
      )
      return 0
    },
  )
  .command(
    'fcrush',
    [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      'frequency crush to all 4 channels of #play',
    ],
    (_, words) => {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        0,
        'fc',
        words,
      )
      return 0
    },
  )
  .command(
    'autofilter',
    [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      'autofilter to all 4 channels of #play',
    ],
    (_, words) => {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        0,
        'autofilter',
        words,
      )
      return 0
    },
  )
  .command(
    'reverb',
    [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      'reverb to all 4 channels of #play',
    ],
    (_, words) => {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        0,
        'reverb',
        words,
      )
      return 0
    },
  )
  .command(
    'distort',
    [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      'distortion to all 4 channels of #play',
    ],
    (_, words) => {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        0,
        'distort',
        words,
      )
      return 0
    },
  )
  .command(
    'vibrato',
    [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      'vibrato to all 4 channels of #play',
    ],
    (_, words) => {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        0,
        'vibrato',
        words,
      )
      return 0
    },
  )
  .command(
    'autowah',
    [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      'autowah to all 4 channels of #play',
    ],
    (_, words) => {
      handlesynthvoicefx(
        READ_CONTEXT.elementfocus,
        READ_CONTEXT.board?.id ?? '',
        0,
        'autowah',
        words,
      )
      return 0
    },
  )

// handle individual synth voices
for (let i = 0; i < 4; ++i) {
  AUDIO_FIRMWARE.command(
    `synth${i + 1}`,
    [AUDIO_CMD_DESC[`synth${i + 1}`]],
    (_, words) => {
      const bid = READ_CONTEXT.board?.id ?? ''
      handlesynthvoice(READ_CONTEXT.elementfocus, bid, i, words)
      return 0
    },
  )
}

// handle bgplay synth voices
AUDIO_FIRMWARE.command('synth5', [AUDIO_CMD_DESC.synth5], (_, words) => {
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
  const group = i < 2 ? 0 : 1
  AUDIO_FIRMWARE.command(
    `echo${idx}`,
    [
      ARG_TYPE.NUMBER_OR_STRING,
      ARG_TYPE.MAYBE_NUMBER_OR_STRING,
      AUDIO_CMD_DESC[`echo${idx}`],
    ],
    (_, words) => {
      const bid = READ_CONTEXT.board?.id ?? ''
      handlesynthvoicefx(READ_CONTEXT.elementfocus, bid, group, 'echo', words)
      return 0
    },
  )
    .command(
      `fcrush${idx}`,
      [
        ARG_TYPE.NUMBER_OR_STRING,
        ARG_TYPE.MAYBE_NUMBER_OR_STRING,
        AUDIO_CMD_DESC[`fcrush${idx}`],
      ],
      (_, words) => {
        const bid = READ_CONTEXT.board?.id ?? ''
        handlesynthvoicefx(
          READ_CONTEXT.elementfocus,
          bid,
          group,
          'fcrush',
          words,
        )
        return 0
      },
    )
    .command(
      `autofilter${idx}`,
      [
        ARG_TYPE.NUMBER_OR_STRING,
        ARG_TYPE.MAYBE_NUMBER_OR_STRING,
        AUDIO_CMD_DESC[`autofilter${idx}`],
      ],
      (_, words) => {
        const bid = READ_CONTEXT.board?.id ?? ''
        handlesynthvoicefx(
          READ_CONTEXT.elementfocus,
          bid,
          group,
          'autofilter',
          words,
        )
        return 0
      },
    )
    .command(
      `reverb${idx}`,
      [
        ARG_TYPE.NUMBER_OR_STRING,
        ARG_TYPE.MAYBE_NUMBER_OR_STRING,
        AUDIO_CMD_DESC[`reverb${idx}`],
      ],
      (_, words) => {
        const bid = READ_CONTEXT.board?.id ?? ''
        handlesynthvoicefx(
          READ_CONTEXT.elementfocus,
          bid,
          group,
          'reverb',
          words,
        )
        return 0
      },
    )
    .command(
      `distort${idx}`,
      [
        ARG_TYPE.NUMBER_OR_STRING,
        ARG_TYPE.MAYBE_NUMBER_OR_STRING,
        AUDIO_CMD_DESC[`distort${idx}`],
      ],
      (_, words) => {
        const bid = READ_CONTEXT.board?.id ?? ''
        handlesynthvoicefx(
          READ_CONTEXT.elementfocus,
          bid,
          group,
          'distort',
          words,
        )
        return 0
      },
    )
    .command(
      `vibrato${idx}`,
      [
        ARG_TYPE.NUMBER_OR_STRING,
        ARG_TYPE.MAYBE_NUMBER_OR_STRING,
        AUDIO_CMD_DESC[`vibrato${idx}`],
      ],
      (_, words) => {
        const bid = READ_CONTEXT.board?.id ?? ''
        handlesynthvoicefx(
          READ_CONTEXT.elementfocus,
          bid,
          group,
          'vibrato',
          words,
        )
        return 0
      },
    )
    .command(
      `autowah${idx}`,
      [
        ARG_TYPE.NUMBER_OR_STRING,
        ARG_TYPE.MAYBE_NUMBER_OR_STRING,
        AUDIO_CMD_DESC[`autowah${idx}`],
      ],
      (_, words) => {
        const bid = READ_CONTEXT.board?.id ?? ''
        handlesynthvoicefx(
          READ_CONTEXT.elementfocus,
          bid,
          group,
          'autowah',
          words,
        )
        return 0
      },
    )
}
