import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  gadgetserverclearscroll,
  registerbookmarkdelete,
  registerbookmarkurlnavigate,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { handlebookmarkscrollpanel } from 'zss/device/vm/handlers/bookmarkscroll'

jest.mock('zss/device/api', () => ({
  registerbookmarkdelete: jest.fn(),
  gadgetserverclearscroll: jest.fn(),
  registerbookmarkurlnavigate: jest.fn(),
  registerbookmarkurlsave: jest.fn(),
}))
jest.mock('zss/device/session', () => ({
  SOFTWARE: { __brand: 'SOFTWARE' },
}))
jest.mock('zss/memory/bookmarkscroll', () => ({
  memorybookmarkscroll: jest.fn(),
}))
jest.mock('zss/feature/bookmarks', () => ({
  normalizebookmarks: jest.fn((raw: unknown) => raw),
}))

describe('handlebookmarkscrollpanel', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    jest.mocked(registerbookmarkurlnavigate).mockClear()
    jest.mocked(registerbookmarkdelete).mockClear()
    jest.mocked(gadgetserverclearscroll).mockClear()
  })

  it('bookmarkurl forwards href via registerbookmarkurlnavigate from message.data[0]', () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: ['https://example.com/path'],
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarkurl')
    expect(registerbookmarkurlnavigate).toHaveBeenCalledWith(
      vm,
      'p1',
      'https://example.com/path',
    )
  })

  it('bookmarkurl uses string data when not an array', () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: 'https://a.test',
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarkurl')
    expect(registerbookmarkurlnavigate).toHaveBeenCalledWith(
      vm,
      'p1',
      'https://a.test',
    )
  })

  it('bookmarkurl no-ops when href missing', () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: [],
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarkurl')
    expect(registerbookmarkurlnavigate).not.toHaveBeenCalled()
  })

  it('bookmarkdel calls registerbookmarkdelete and gadgetserverclearscroll from message.data[0]', () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: ['abc-id'],
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarkdel')
    expect(registerbookmarkdelete).toHaveBeenCalledWith(vm, 'p1', 'abc-id')
    expect(gadgetserverclearscroll).toHaveBeenCalledWith(SOFTWARE, 'p1')
  })

  it('bookmarkdel uses string data when not an array', () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: 'xyz-id',
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarkdel')
    expect(registerbookmarkdelete).toHaveBeenCalledWith(vm, 'p1', 'xyz-id')
    expect(gadgetserverclearscroll).toHaveBeenCalledWith(SOFTWARE, 'p1')
  })

  it('bookmarkdel no-ops when id missing', () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: [],
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarkdel')
    expect(registerbookmarkdelete).not.toHaveBeenCalled()
    expect(gadgetserverclearscroll).not.toHaveBeenCalled()
  })
})
