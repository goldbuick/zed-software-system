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
jest.mock('zss/memory/flags', () => ({
  memoryreadflags: (id: string) => {
    if (!chipflagstore[id]) {
      chipflagstore[id] = {}
    }
    return chipflagstore[id]
  },
  memoryclearflags: (id: string) => {
    delete chipflagstore[id]
  },
}))

jest.mock('zss/firmware/runner', () => ({
  DRIVER_TYPE: { RUNTIME: 0, CLI: 1 },
  firmwareaftertick: jest.fn(),
  firmwareeverytick: jest.fn(),
  firmwareget: () => [false, undefined],
  firmwaregetcommand: () => undefined,
  firmwareset: () => [false, undefined],
}))

jest.mock('zss/memory/permissions', () => ({
  memorycanruncommand: () => true,
}))

import { createchip } from 'zss/chip'
import type { CHIP } from 'zss/chip'
import type { GeneratorBuild } from 'zss/feature/lang/backend/typescript/generator'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { createchipid } from 'zss/mapping/guid'

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
  return createchip(id, DRIVER_TYPE.RUNTIME, idlebuild())
}

describe('chip and / or empty-array truthiness', () => {
  beforeEach(() => {
    for (const key of Object.keys(chipflagstore)) {
      delete chipflagstore[key]
    }
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
