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

const mockedapierror = jest.fn()
jest.mock('zss/device/api', () => ({
  apierror: (...args: unknown[]) => mockedapierror(...args),
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

function tightloopbuild(): GeneratorBuild {
  return {
    labels: { start: [1] },
    code: (api: CHIP) => {
      while (true) {
        if (api.sy()) {
          return 1
        }
      }
    },
  }
}

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

function makechip(id: string, build: GeneratorBuild) {
  delete chipflagstore[createchipid(id)]
  mockedapierror.mockClear()
  return createchip(id, DRIVER_TYPE.RUNTIME, build)
}

describe('slow-code strike halt', () => {
  beforeEach(() => {
    for (const key of Object.keys(chipflagstore)) {
      delete chipflagstore[key]
    }
    mockedapierror.mockClear()
  })

  it('halts after 3 consecutive max-iteration ticks', () => {
    const chip = makechip('slow_loop', tightloopbuild())

    chip.once()
    expect(chip.isended()).toBe(false)
    expect(chip.shouldtick()).toBe(true)
    expect(mockedapierror).not.toHaveBeenCalled()

    chip.once()
    expect(chip.isended()).toBe(false)
    expect(mockedapierror).not.toHaveBeenCalled()

    chip.once()
    expect(chip.isended()).toBe(true)
    expect(chip.shouldtick()).toBe(false)
    expect(mockedapierror).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'slow',
      expect.stringContaining('halted after 3 max-iteration ticks'),
    )
  })

  it('resets strike count on voluntary yield so non-consecutive maxes do not ban', () => {
    const id = 'strike_reset'
    const loop = makechip(id, tightloopbuild())

    loop.once()
    loop.once()
    expect(loop.isended()).toBe(false)
    expect(mockedapierror).not.toHaveBeenCalled()

    const mem = createchipid(id)
    const flags = chipflagstore[mem]
    expect(flags.sc).toBe(2)

    // voluntary yield under budget resets strikes (same flags via same chip id)
    const idle = createchip(id, DRIVER_TYPE.RUNTIME, idlebuild())
    idle.once()
    expect(flags.sc).toBe(0)
    expect(idle.isended()).toBe(false)
    expect(mockedapierror).not.toHaveBeenCalled()

    // two more maxed ticks still under limit
    const again = createchip(id, DRIVER_TYPE.RUNTIME, tightloopbuild())
    again.once()
    again.once()
    expect(again.isended()).toBe(false)
    expect(flags.sc).toBe(2)
    expect(mockedapierror).not.toHaveBeenCalled()

    again.once()
    expect(again.isended()).toBe(true)
    expect(again.shouldtick()).toBe(false)
    expect(mockedapierror).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'slow',
      expect.stringContaining('halted after 3 max-iteration ticks'),
    )
  })

  it('keeps shouldtick false after ban even if ended state is cleared', () => {
    const chip = makechip('banned', tightloopbuild())
    chip.once()
    chip.once()
    chip.once()
    expect(chip.shouldtick()).toBe(false)

    const flags = chipflagstore[createchipid('banned')]
    flags.es = 0
    expect(chip.shouldtick()).toBe(false)
  })
})
