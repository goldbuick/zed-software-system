import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apitoast } from 'zss/device/api'
import { handlerefscroll } from 'zss/device/vm/handlers/scroll'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { romread } from 'zss/rom'

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

jest.mock('zss/rom', () => ({
  romread: jest.fn(),
}))

jest.mock('zss/device/api', () => ({
  apitoast: jest.fn(),
}))

jest.mock('zss/gadget/data/scrollwritelines', () => ({
  scrollwritelines: jest.fn(),
  scrolllinkescapefrag: (s: string) => s.replaceAll(';', '$59'),
}))

jest.mock('zss/memory/inspectionmakeit', () => ({
  memorymakeitscroll: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memoryreadplayerboard: jest.fn(),
}))

describe('handlerefscroll', () => {
  const vm = {} as DEVICE
  const message: MESSAGE = {
    session: '',
    player: 'p1',
    id: 'id',
    sender: '',
    target: 'refscroll',
    data: undefined,
  }

  beforeEach(() => {
    jest.mocked(romread).mockReset()
    jest.mocked(scrollwritelines).mockClear()
    jest.mocked(apitoast).mockClear()
  })

  it('applies ROM refscroll:menu via scrollwritelines', () => {
    jest
      .mocked(romread)
      .mockImplementation((key: string) =>
        key === 'refscroll:menu' ? '!x y;$lbl\n' : undefined,
      )
    handlerefscroll(vm, message)
    expect(scrollwritelines).toHaveBeenCalledWith(
      'p1',
      '#help or $meta+h',
      '!x y;$lbl',
      'refscroll',
    )
    expect(apitoast).not.toHaveBeenCalled()
  })

  it('toasts when refscroll:menu is missing or blank', () => {
    jest.mocked(romread).mockReturnValue(undefined)
    handlerefscroll(vm, message)
    expect(scrollwritelines).not.toHaveBeenCalled()
    expect(apitoast).toHaveBeenCalledWith(
      vm,
      'p1',
      'gadget scroll: need content',
    )
  })
})
