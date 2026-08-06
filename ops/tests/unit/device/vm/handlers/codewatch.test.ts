jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
}))

jest.mock('zss/device/api', () => ({
  vmcodeaddress: (book: string, path: unknown) =>
    `${book}:${JSON.stringify(path)}`,
  boardrunnerhaltchip: jest.fn(),
}))

jest.mock('zss/device/modem', () => ({
  modemreadtextsync: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnerpushupdates', () => ({
  boardrunnerpushupdates: jest.fn(),
}))

jest.mock('zss/memory/boardaccess', () => ({
  memoryreadobject: jest.fn(),
}))

jest.mock('zss/memory/bookoperations', () => ({
  memoryreadcodepage: jest.fn(),
}))

jest.mock('zss/memory/codepageoperations', () => ({
  memoryapplyelementstats: jest.fn(),
  memoryreadcodepagedata: jest.fn(),
  memoryreadcodepagestatsfromtext: jest.fn(() => ({})),
  memoryreadcodepagetype: jest.fn(),
  memoryresetcodepagestats: jest.fn(),
}))

jest.mock('zss/memory/runtime', () => ({
  memoryhaltchip: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbookbyaddress: jest.fn(),
}))

import type { DEVICE } from 'zss/device'
import { boardrunnerhaltchip } from 'zss/device/api'
import { modemreadtextsync } from 'zss/device/modem'
import type { MESSAGE } from 'zss/device/types'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import {
  handlecoderelease,
  handlecodewatch,
} from 'zss/device/vm/handlers/codewatch'
import { boardrunners, watching } from 'zss/device/vm/state'
import { memoryreadobject } from 'zss/memory/boardaccess'
import { memoryreadcodepage } from 'zss/memory/bookoperations'
import {
  memoryapplyelementstats,
  memoryreadcodepagedata,
  memoryreadcodepagetype,
} from 'zss/memory/codepageoperations'
import { memoryhaltchip } from 'zss/memory/runtime'
import { memoryreadbookbyaddress } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

describe('codewatch handlers', () => {
  const vm = {} as DEVICE
  const book = 'book-1'
  const path = ['board-page', 'obj-1']
  const object = { code: 'old' }

  function msg(player: string): MESSAGE {
    return {
      session: '',
      player,
      id: 'id',
      sender: '',
      target: 'codewatch',
      data: [book, path],
    }
  }

  beforeEach(() => {
    for (const key of Object.keys(watching)) {
      delete watching[key]
    }
    for (const key of Object.keys(boardrunners)) {
      delete boardrunners[key]
    }
    boardrunners['board-page'] = 'runner-1'
    jest.mocked(modemreadtextsync).mockReset()
    jest.mocked(boardrunnerpushupdates).mockClear()
    jest.mocked(boardrunnerhaltchip).mockClear()
    jest.mocked(memoryhaltchip).mockClear()
    jest.mocked(memoryapplyelementstats).mockClear()
    jest.mocked(memoryreadbookbyaddress).mockReturnValue({} as never)
    jest.mocked(memoryreadcodepage).mockReturnValue({ code: 'page' } as never)
    jest
      .mocked(memoryreadcodepagetype)
      .mockReturnValue(CODE_PAGE_TYPE.BOARD)
    jest.mocked(memoryreadcodepagedata).mockReturnValue({} as never)
    jest.mocked(memoryreadobject).mockReturnValue(object as never)
    object.code = 'old'
  })

  it('handlecodewatch does not write MEMORY while typing', () => {
    handlecodewatch(vm, msg('p1'))
    expect(object.code).toBe('old')
    expect(modemreadtextsync).not.toHaveBeenCalled()
  })

  it('handlecoderelease applies modem text once on last watcher', () => {
    jest.mocked(modemreadtextsync).mockReturnValue('@obj\n#end')
    handlecodewatch(vm, msg('p1'))
    handlecoderelease(vm, { ...msg('p1'), target: 'coderelease' })
    expect(modemreadtextsync).toHaveBeenCalledTimes(1)
    expect(object.code).toBe('@obj\n#end')
    expect(memoryapplyelementstats).toHaveBeenCalled()
    expect(memoryhaltchip).toHaveBeenCalledWith('obj-1')
    expect(boardrunnerpushupdates).toHaveBeenCalledWith(vm)
    expect(boardrunnerhaltchip).toHaveBeenCalledWith(vm, 'runner-1', 'obj-1')
  })

  it('handlecoderelease waits until the last watcher leaves', () => {
    jest.mocked(modemreadtextsync).mockReturnValue('final')
    handlecodewatch(vm, msg('p1'))
    handlecodewatch(vm, msg('p2'))
    handlecoderelease(vm, { ...msg('p1'), target: 'coderelease' })
    expect(modemreadtextsync).not.toHaveBeenCalled()
    expect(object.code).toBe('old')
    handlecoderelease(vm, { ...msg('p2'), target: 'coderelease' })
    expect(object.code).toBe('final')
  })
})
