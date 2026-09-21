jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 8,
    YIELD_STRIKE_LIMIT: 3,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  DEBUG_SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
}))

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
  chipmessage: jest.fn(),
}))

jest.mock('zss/device/session', () => ({
  SOFTWARE: { emit: jest.fn() },
}))

const chipflagstore: Record<string, Record<string, unknown>> = {}
jest.mock('zss/memory/session', () => ({
  memoryreadmainbook: () => ({ id: 'main' }),
}))
jest.mock('zss/memory/bookoperations', () => ({
  memoryreadflags: (_book: unknown, id: string) => {
    if (!chipflagstore[id]) {
      chipflagstore[id] = {}
    }
    return chipflagstore[id]
  },
  memoryclearflags: (_book: unknown, id: string) => {
    delete chipflagstore[id]
  },
}))

jest.mock('zss/firmware/runner', () => ({
  DRIVER_TYPE: { RUNTIME: 0, CLI: 1 },
  firmwareaftertick: jest.fn(),
  firmwareeverytick: jest.fn(),
  firmwareget: (_driver: unknown, chip: { id: () => string }, name: string) => {
    const bag = chipflagstore[chip.id()]
    if (bag && name in bag) {
      return [true, bag[name]]
    }
    return [false, undefined]
  },
  firmwaregetcommand: () => undefined,
  firmwareset: (
    _driver: unknown,
    chip: { id: () => string },
    name: string,
    value: unknown,
  ) => {
    if (!chipflagstore[chip.id()]) {
      chipflagstore[chip.id()] = {}
    }
    chipflagstore[chip.id()][name] = value
    return [true, value]
  },
}))

jest.mock('zss/memory/permissions', () => ({
  memorycanruncommand: () => true,
}))

import { createchip } from 'zss/chip'
import type { CHIP } from 'zss/chip'
import type { GeneratorBuild } from 'zss/feature/lang/backend/typescript/generator'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { createchipid } from 'zss/mapping/guid'
import { READ_CONTEXT } from 'zss/words/reader'

function idlebuild(): GeneratorBuild {
  return {
    labels: { start: [1] },
    code: (api: CHIP) => {
      api.yield()
      if (api.sy()) {
        return 1
      }
      return 1
    },
  }
}

function makechip(id: string) {
  delete chipflagstore[createchipid(id)]
  delete chipflagstore[id]
  const chip = createchip(id, DRIVER_TYPE.RUNTIME, idlebuild())
  READ_CONTEXT.get = (name: string) => chip.get(name)
  return chip
}

describe('chip and / or empty-array truthiness', () => {
  beforeEach(() => {
    for (const key of Object.keys(chipflagstore)) {
      delete chipflagstore[key]
    }
    READ_CONTEXT.get = undefined
  })

  afterEach(() => {
    READ_CONTEXT.get = undefined
  })

  it('and treats empty array as falsy (inputmove [] and inputshift)', () => {
    const chip = makechip('and_empty')
    // empty inputmove must short-circuit; returning [] keeps if(maptoresult) falsy
    expect(chip.and([], 1)).toEqual([])
    expect(chip.if([])).toBe(0)
    expect(chip.if(chip.and([], 1))).toBe(0)
  })

  it('and passes non-empty dir arrays through with a truthy second arg', () => {
    const chip = makechip('and_dirs')
    expect(chip.and(['NORTH'], 1)).toBe(1)
    expect(chip.if(chip.and(['NORTH'], 1))).toBe(1)
  })

  it('or treats empty array as falsy and continues', () => {
    const chip = makechip('or_empty')
    expect(chip.or([], 1)).toBe(1)
    expect(chip.or([], 0)).toBe(0)
  })
})

describe('chip unset flag truthiness (dual-use pass-through)', () => {
  beforeEach(() => {
    for (const key of Object.keys(chipflagstore)) {
      delete chipflagstore[key]
    }
    READ_CONTEXT.get = undefined
  })

  afterEach(() => {
    READ_CONTEXT.get = undefined
  })

  it('if treats unset bare flag as falsy', () => {
    const chip = makechip('if_unset')
    expect(chip.if('follower')).toBe(0)
  })

  it('not treats unset bare flag as falsy input (returns 1)', () => {
    const chip = makechip('not_unset')
    expect(chip.not('follower')).toBe(1)
  })

  it('or skips unset and returns next truthy', () => {
    const chip = makechip('or_unset')
    expect(chip.or('follower', 1)).toBe(1)
    expect(chip.or('follower', 0)).toBe(0)
  })

  it('and stops on unset as falsy (returns the unset name pass-through)', () => {
    const chip = makechip('and_unset')
    // and returns the first falsy operand; unset names stay dual-use strings
    expect(chip.and('follower', 1)).toBe('follower')
    expect(chip.if(chip.and('follower', 1))).toBe(0)
  })

  it('if treats set numeric flags as truthy; string values are flag names', () => {
    const chip = makechip('if_set')
    chip.set('follower', 1)
    expect(chip.if('follower')).toBe(1)
    // resolved string is looked up again as a flag name (maptoresult)
    chip.set('follower', 'oid_seg')
    expect(chip.if('follower')).toBe(0)
    chip.set('oid_seg', 1)
    expect(chip.if('follower')).toBe(1)
  })

  it('iseq: unset name maps to 0; string flag values remapped via maptovalue', () => {
    const chip = makechip('iseq_unset')
    // maptovalue(unset) -> 0, so unset name == unset name is 0 === name
    expect(chip.iseq('follower', 'follower')).toBe(0)
    expect(chip.iseq('follower', 0)).toBe(1)
    expect(chip.iseq('follower', 'other')).toBe(0)
    // doot resolves to 'fart', then maptovalue('fart') -> 0 (unset name)
    chip.set('doot', 'fart')
    expect(chip.iseq('doot', 'fart')).toBe(0)
    expect(chip.iseq('doot', 0)).toBe(1)
    chip.set('score', 3)
    expect(chip.iseq('score', 3)).toBe(1)
  })

  it('opplus / opminus coerce unset bare flags to 0', () => {
    const chip = makechip('arith_unset')
    expect(chip.opplus('follower', 1)).toBe(1)
    expect(chip.opminus(5, 'follower')).toBe(5)
    chip.set('score', 3)
    expect(chip.opplus('score', 2)).toBe(5)
  })

  it('expr still returns unset name string (dual-use)', () => {
    const chip = makechip('expr_unset')
    expect(chip.expr('follower')).toBe('follower')
  })
})
