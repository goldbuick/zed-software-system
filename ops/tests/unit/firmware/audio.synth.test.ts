import type { CHIP } from 'zss/chip'
import { synthvoice, synthvoicefx } from 'zss/device/api'
import { AUDIO_FIRMWARE } from 'zss/firmware/audio'
import {
  memorymergesynthvoice,
  memorymergesynthvoicefx,
} from 'zss/memory/synthstate'
import { resolveargitems } from 'zss/screens/tape/argcomplete'
import { READ_CONTEXT } from 'zss/words/reader'

jest.mock('zss/device/api', () => ({
  ...jest.requireActual('zss/device/api'),
  synthvoice: jest.fn(),
  synthvoicefx: jest.fn(),
}))

jest.mock('zss/memory/synthstate', () => ({
  ...jest.requireActual('zss/memory/synthstate'),
  memorymergesynthvoice: jest.fn(),
  memorymergesynthvoicefx: jest.fn(),
}))

const emptywords = {
  langcommands: {},
  clicommands: {},
  loadercommands: {},
  runtimecommands: {},
  flags: [],
  statsboard: [],
  statshelper: [],
  statssender: [],
  statsinteraction: [],
  statsboolean: [],
  statsconfig: [],
  objects: [],
  terrains: [],
  boards: [],
  palettes: [],
  charsets: [],
  loaders: [],
  categories: [],
  colors: [],
  dirs: [],
  dirmods: [],
  exprs: [],
  roles: [],
  permissionconfigs: [],
  players: [],
  commandargmeta: {},
}

describe('AUDIO_FIRMWARE fx and ttsengine argmeta', () => {
  it('registers on/off for reverb and echo1', () => {
    const reverb = AUDIO_FIRMWARE.getcommandargmeta('reverb')
    const echo1 = AUDIO_FIRMWARE.getcommandargmeta('echo1')
    expect(reverb?.byposition?.[0]).toContain('on')
    expect(reverb?.byposition?.[0]).toContain('off')
    expect(reverb?.byposition?.[0]).toContain('decay')
    expect(echo1?.byposition?.[0]).toEqual(reverb?.byposition?.[0])
  })

  it('suggests on for prefix o on reverb', () => {
    const meta = AUDIO_FIRMWARE.getcommandargmeta('reverb')
    const items = resolveargitems({
      words: emptywords,
      meta,
      argindex: 0,
      firstarglower: '',
      maybesig: undefined,
      prefix: 'o',
    })
    const words = items.map((item) => item.word)
    expect(words).toContain('on')
    expect(words).toContain('off')
  })

  it('registers ttsengine engines and fish models', () => {
    const meta = AUDIO_FIRMWARE.getcommandargmeta('ttsengine')
    expect(meta?.byposition?.[0]).toEqual(
      expect.arrayContaining(['piper', 'supertonic', 'fish']),
    )
    expect(meta?.whenfirst?.fish?.[2]).toEqual(
      expect.arrayContaining(['s2.1-pro-free', 's1']),
    )
  })
})

describe('AUDIO_FIRMWARE synth argmeta', () => {
  it('registers autocomplete for synth and synth1', () => {
    const synthmeta = AUDIO_FIRMWARE.getcommandargmeta('synth')
    const synth1meta = AUDIO_FIRMWARE.getcommandargmeta('synth1')
    expect(synthmeta?.byposition?.[0]).toEqual(synth1meta?.byposition?.[0])
    expect(synthmeta?.byposition?.[0]).toContain('bells')
    expect(synthmeta?.byposition?.[0]).toContain('buzz')
    expect(synthmeta?.byposition?.[0]).toContain('fmsquare')
    expect(synthmeta?.byposition?.[0]).toContain('harmonicity')
    expect(synthmeta?.byposition?.[0]).not.toContain('drip')
    expect(synthmeta?.byposition?.[0]).not.toContain('epiano')
    expect(synthmeta?.byposition?.[0]).not.toContain('echo')
    expect(synthmeta?.byposition?.[0]).not.toContain('reverb')
  })

  it('suggests bells and buzz for prefix b', () => {
    const meta = AUDIO_FIRMWARE.getcommandargmeta('synth')
    const items = resolveargitems({
      words: emptywords,
      meta,
      argindex: 0,
      firstarglower: '',
      maybesig: undefined,
      prefix: 'b',
    })
    const words = items.map((item) => item.word)
    expect(words).toContain('bells')
    expect(words).toContain('buzz')
    expect(words).not.toContain('echo')
  })

  it('scopes string vs piano config keywords', () => {
    const stringmeta = AUDIO_FIRMWARE.getcommandargmeta('string')
    const pianometa = AUDIO_FIRMWARE.getcommandargmeta('piano')
    expect(stringmeta?.byposition?.[0]).toContain('detune')
    expect(stringmeta?.byposition?.[0]).not.toContain('hammer')
    expect(pianometa?.byposition?.[0]).toContain('hammer')
    expect(pianometa?.byposition?.[0]).not.toContain('detune')
  })

  it('shares fmsquare argmeta with channel variants', () => {
    const bare = AUDIO_FIRMWARE.getcommandargmeta('fmsquare')
    const one = AUDIO_FIRMWARE.getcommandargmeta('fmsquare1')
    expect(bare?.byposition?.[0]).toEqual(one?.byposition?.[0])
    expect(bare?.byposition?.[0]).toContain('harmonicity')
    expect(bare?.byposition?.[0]).toContain('modtype')
  })

  it('suggests harmonicity for prefix h on fmsquare', () => {
    const meta = AUDIO_FIRMWARE.getcommandargmeta('fmsquare')
    const items = resolveargitems({
      words: emptywords,
      meta,
      argindex: 0,
      firstarglower: '',
      maybesig: undefined,
      prefix: 'h',
    })
    const words = items.map((item) => item.word)
    expect(words).toContain('harmonicity')
  })

  it('suggests square after modtype on fmsquare', () => {
    const meta = AUDIO_FIRMWARE.getcommandargmeta('fmsquare')
    const items = resolveargitems({
      words: emptywords,
      meta,
      argindex: 1,
      firstarglower: 'modtype',
      maybesig: undefined,
      prefix: 's',
    })
    const words = items.map((item) => item.word)
    expect(words).toContain('square')
    expect(words).toContain('sine')
  })
})

describe('AUDIO_FIRMWARE synth command', () => {
  const chip = {} as CHIP

  beforeEach(() => {
    jest.clearAllMocks()
    READ_CONTEXT.elementfocus = 'player1'
    READ_CONTEXT.board = { id: 'board1' } as typeof READ_CONTEXT.board
  })

  it('does not route echo through synthvoicefx', () => {
    const handler = AUDIO_FIRMWARE.getcommand('synth')
    expect(handler).toBeDefined()
    handler!(chip, ['echo', 'on'])
    expect(synthvoicefx).not.toHaveBeenCalled()
    expect(memorymergesynthvoicefx).not.toHaveBeenCalled()
    expect(synthvoice).toHaveBeenCalled()
    expect(memorymergesynthvoice).toHaveBeenCalled()
  })

  it('routes buzz through synthvoice', () => {
    const handler = AUDIO_FIRMWARE.getcommand('synth1')
    expect(handler).toBeDefined()
    handler!(chip, ['buzz'])
    expect(synthvoicefx).not.toHaveBeenCalled()
    expect(synthvoice).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'board1',
      0,
      'buzz',
      undefined,
    )
  })

  it('config-only fmsquare does not type-select', () => {
    const handler = AUDIO_FIRMWARE.getcommand('fmsquare')
    expect(handler).toBeDefined()
    handler!(chip, ['harmonicity', 7])
    expect(synthvoice).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'board1',
      0,
      'harmonicity',
      7,
    )
    expect(synthvoice).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'fmsquare',
      expect.anything(),
    )
  })

  it('fmsquare1 targets voice 0 only; fmsquare5 targets bgplay 4-7', () => {
    const one = AUDIO_FIRMWARE.getcommand('fmsquare1')
    const five = AUDIO_FIRMWARE.getcommand('fmsquare5')
    expect(one).toBeDefined()
    expect(five).toBeDefined()
    one!(chip, ['harmonicity', 3])
    expect(synthvoice).toHaveBeenCalledTimes(1)
    expect(synthvoice).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'board1',
      0,
      'harmonicity',
      3,
    )
    jest.clearAllMocks()
    five!(chip, ['harmonicity', 4])
    const indices = (synthvoice as jest.Mock).mock.calls.map(
      (call: unknown[]) => call[3],
    )
    expect(indices).toEqual([4, 5, 6, 7])
  })

  it('string detune is config-only across play voices', () => {
    const handler = AUDIO_FIRMWARE.getcommand('string')
    expect(handler).toBeDefined()
    handler!(chip, ['detune', 0.3])
    expect(synthvoice).toHaveBeenCalledTimes(4)
    expect(synthvoice).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'board1',
      0,
      'detune',
      0.3,
    )
  })
})
