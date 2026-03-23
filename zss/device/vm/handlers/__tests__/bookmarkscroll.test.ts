import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'

const mockregisterbookmarkurlnavigate = jest.fn()

jest.mock('zss/device/api', () => ({
  registerbookmarkdelete: jest.fn(),
  registerbookmarkscroll: jest.fn(),
  registerbookmarkurlnavigate: mockregisterbookmarkurlnavigate,
  registerbookmarkurlsave: jest.fn(),
}))
jest.mock('zss/memory/bookmarkscroll', () => ({
  memorybookmarkscroll: jest.fn(),
}))
jest.mock('zss/feature/bookmarks', () => ({
  normalizebookmarks: jest.fn((raw: unknown) => raw),
}))

import { handlebookmarkscrollpanel } from '../bookmarkscroll'

describe('handlebookmarkscrollpanel', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    mockregisterbookmarkurlnavigate.mockClear()
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
    expect(mockregisterbookmarkurlnavigate).toHaveBeenCalledWith(
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
    expect(mockregisterbookmarkurlnavigate).toHaveBeenCalledWith(
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
    expect(mockregisterbookmarkurlnavigate).not.toHaveBeenCalled()
  })
})
