jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
}))

jest.mock('zss/device/api', () => ({
  apitoast: jest.fn(),
}))

jest.mock('zss/gadget/data/api', () => ({
  gadgetclearscroll: jest.fn(),
}))

jest.mock('zss/gadget/data/scrollwritelines', () => ({
  scrollwritelines: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnerpushupdates', () => ({
  boardrunnerpushupdates: jest.fn(),
}))

jest.mock('zss/memory/inspectionmakeit', () => ({
  memorymakeitscroll: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memoryreadplayerboard: jest.fn(),
}))

jest.mock('zss/memory/runtime', () => ({
  memoryunlockscroll: jest.fn(),
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apitoast } from 'zss/device/api'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import {
  handleclearscroll,
  handlegadgetscroll,
  handlemakeitscroll,
} from 'zss/device/vm/handlers/scroll'
import { gadgetclearscroll } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { memorymakeitscroll } from 'zss/memory/inspectionmakeit'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryunlockscroll } from 'zss/memory/runtime'
import type { BOARD } from 'zss/memory/types'

describe('scroll handlers', () => {
  const vm = {} as DEVICE
  const message: MESSAGE = {
    session: '',
    player: 'p1',
    id: 'id',
    sender: '',
    target: 'scroll',
    data: undefined,
  }

  beforeEach(() => {
    jest.mocked(gadgetclearscroll).mockClear()
    jest.mocked(boardrunnerpushupdates).mockClear()
    jest.mocked(scrollwritelines).mockClear()
    jest.mocked(apitoast).mockClear()
    jest.mocked(memorymakeitscroll).mockClear()
    jest.mocked(memoryunlockscroll).mockClear()
    jest.mocked(memoryreadplayerboard).mockReturnValue({
      id: 'b1',
      name: 'b1',
      terrain: [],
      objects: { obj1: {} },
    } as BOARD)
  })

  it('handleclearscroll clears scroll and unlocks board objects', () => {
    handleclearscroll(vm, message)
    expect(gadgetclearscroll).toHaveBeenCalledWith('p1')
    expect(memoryunlockscroll).toHaveBeenCalledWith('obj1', 'p1')
    expect(boardrunnerpushupdates).toHaveBeenCalledWith(vm)
  })

  it('handlemakeitscroll forwards string data', () => {
    handlemakeitscroll(vm, { ...message, data: 'makeit payload' })
    expect(memorymakeitscroll).toHaveBeenCalledWith('makeit payload', 'p1')
  })

  it('handlegadgetscroll validates payload and writes scroll lines', () => {
    handlegadgetscroll(vm, {
      ...message,
      data: { scrollname: 'Title', content: '!hello;$lbl\n', chip: 'testchip' },
    })
    expect(scrollwritelines).toHaveBeenCalledWith(
      'p1',
      'Title',
      '!hello;$lbl',
      'testchip',
    )
  })

  it('handlegadgetscroll toasts on invalid payload', () => {
    handlegadgetscroll(vm, {
      ...message,
      data: { scrollname: '', content: 'x' },
    })
    expect(scrollwritelines).not.toHaveBeenCalled()
    expect(apitoast).toHaveBeenCalled()
  })
})
