jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  DEBUG_SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
}))

jest.mock('zss/device/api', () => ({
  vmcodeaddress: (book: string, path: unknown) =>
    `${book}:${JSON.stringify(path)}`,
}))

const observecallbacks = new Map<string, (value: string) => void>()

jest.mock('zss/device/modem', () => ({
  modemobservevaluestring: jest.fn(
    (address: string, callback: (value: string) => void) => {
      observecallbacks.set(address, callback)
      return () => {
        observecallbacks.delete(address)
      }
    },
  ),
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
import { vmcodeaddress } from 'zss/device/api'
import { modemobservevaluestring } from 'zss/device/modem'
import type { MESSAGE } from 'zss/device/types'
import {
  handlecoderelease,
  handlecodewatch,
} from 'zss/device/vm/handlers/codewatch'
import { observers, watching } from 'zss/device/vm/state'
import { memoryreadobject } from 'zss/memory/boardaccess'
import { memoryreadcodepage } from 'zss/memory/bookoperations'
import {
  memoryapplyelementstats,
  memoryreadcodepagedata,
  memoryreadcodepagetype,
  memoryresetcodepagestats,
} from 'zss/memory/codepageoperations'
import { memoryhaltchip } from 'zss/memory/runtime'
import { memoryreadbookbyaddress } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

describe('codewatch handlers', () => {
  const vm = {} as DEVICE
  const book = 'book-1'
  const objectpath = ['board-page', 'obj-1']
  const pagepath = ['player-page']
  const object = { code: 'old' }
  const page = { code: 'oldpage' }

  function watchmsg(player: string, path: string[]): MESSAGE {
    return {
      session: '',
      player,
      id: 'id',
      sender: '',
      target: 'codewatch',
      data: [book, path],
    }
  }

  function releasemsg(player: string, path: string[], code: string): MESSAGE {
    return {
      session: '',
      player,
      id: 'id',
      sender: '',
      target: 'coderelease',
      data: [book, path, code],
    }
  }

  beforeEach(() => {
    for (const key of Object.keys(watching)) {
      delete watching[key]
    }
    for (const key of Object.keys(observers)) {
      delete observers[key]
    }
    observecallbacks.clear()
    jest.mocked(modemobservevaluestring).mockClear()
    jest.mocked(memoryhaltchip).mockClear()
    jest.mocked(memoryapplyelementstats).mockClear()
    jest.mocked(memoryresetcodepagestats).mockClear()
    jest.mocked(memoryreadbookbyaddress).mockReturnValue({} as never)
    jest.mocked(memoryreadcodepagedata).mockReturnValue({} as never)
    jest.mocked(memoryreadobject).mockReturnValue(object as never)
    object.code = 'old'
    page.code = 'oldpage'
  })

  describe('board object element (deferred)', () => {
    beforeEach(() => {
      jest.mocked(memoryreadcodepage).mockReturnValue({ code: 'page' } as never)
      jest
        .mocked(memoryreadcodepagetype)
        .mockReturnValue(CODE_PAGE_TYPE.BOARD)
    })

    it('does not write MEMORY or observe while typing', () => {
      handlecodewatch(vm, watchmsg('p1', objectpath))
      expect(object.code).toBe('old')
      expect(modemobservevaluestring).not.toHaveBeenCalled()
    })

    it('applies payload code once on last watcher', () => {
      handlecodewatch(vm, watchmsg('p1', objectpath))
      handlecoderelease(vm, releasemsg('p1', objectpath, '@obj\n#end'))
      expect(object.code).toBe('@obj\n#end')
      expect(memoryapplyelementstats).toHaveBeenCalled()
      expect(memoryhaltchip).toHaveBeenCalledWith('obj-1')
    })

    it('waits until the last watcher leaves', () => {
      handlecodewatch(vm, watchmsg('p1', objectpath))
      handlecodewatch(vm, watchmsg('p2', objectpath))
      handlecoderelease(vm, releasemsg('p1', objectpath, 'final'))
      expect(object.code).toBe('old')
      handlecoderelease(vm, releasemsg('p2', objectpath, 'final'))
      expect(object.code).toBe('final')
    })

    it('ignores messages without a code string payload', () => {
      handlecodewatch(vm, watchmsg('p1', objectpath))
      handlecoderelease(vm, {
        ...watchmsg('p1', objectpath),
        target: 'coderelease',
        data: [book, objectpath],
      })
      expect(object.code).toBe('old')
      expect(watching[vmcodeaddress(book, objectpath)]?.has('p1')).toBe(true)
    })
  })

  describe('codepage (live)', () => {
    beforeEach(() => {
      jest.mocked(memoryreadcodepage).mockReturnValue(page as never)
      jest
        .mocked(memoryreadcodepagetype)
        .mockReturnValue(CODE_PAGE_TYPE.OBJECT)
    })

    it('registers modem observe and writes MEMORY while typing', () => {
      handlecodewatch(vm, watchmsg('p1', pagepath))
      const address = vmcodeaddress(book, pagepath)
      expect(modemobservevaluestring).toHaveBeenCalledWith(
        address,
        expect.any(Function),
      )
      observecallbacks.get(address)?.('@player\n#end')
      expect(page.code).toBe('@player\n#end')
      expect(memoryresetcodepagestats).toHaveBeenCalled()
    })

    it('does not re-apply payload on release; clears observer', () => {
      handlecodewatch(vm, watchmsg('p1', pagepath))
      const address = vmcodeaddress(book, pagepath)
      observecallbacks.get(address)?.('synced')
      page.code = 'synced'
      handlecoderelease(vm, releasemsg('p1', pagepath, 'ignored-payload'))
      expect(page.code).toBe('synced')
      expect(observers[address]).toBeUndefined()
    })
  })
})
