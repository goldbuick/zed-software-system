import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apitoast,
  registerbookmarkcodepagecopytogame,
  registerbookmarkdelete,
  registerbookmarkurlnavigate,
  registerbookmarkurlsave,
  registerbookmarkurlsaveover,
  vmclearscroll,
} from 'zss/device/api'
import {
  handlebookmarkscroll,
  handlebookmarkscrollpanel,
} from 'zss/device/vm/handlers/bookmarkscroll'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorybookmarkscroll,
  memorymainbookisempty,
} from 'zss/memory/bookmarkscroll'
import { memorybookmarkdeleteprompt } from 'zss/memory/bookmarkdeleteconfirm'
import {
  memoryreadbookbysoftware,
  memoryresetbooks,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

jest.mock('zss/device/api', () => ({
  apitoast: jest.fn(),
  apilog: jest.fn(),
  registerbookmarkdelete: jest.fn(),
  vmclearscroll: jest.fn(),
  registerbookmarkurlnavigate: jest.fn(),
  registerbookmarkurlsave: jest.fn(),
  registerbookmarkurlsaveover: jest.fn(),
  registerbookmarkcodepagecopytogame: jest.fn(),
}))
jest.mock('zss/memory/bookmarkscroll', () => ({
  memorybookmarkscroll: jest.fn(),
  memorymainbookisempty: jest.fn(() => false),
}))
jest.mock('zss/memory/bookmarkdeleteconfirm', () => ({
  memorybookmarkdeleteprompt: jest.fn(() => true),
  memoryreadbookmarklistcache: jest.fn(),
  memorycacheterminalbookmarkdelete: jest.fn(),
}))
jest.mock('zss/memory/editorbookmarkscroll', () => ({
  memoryeditorbookmarkscroll: jest.fn(),
}))
jest.mock('zss/gadget/data/api', () => ({
  gadgetclearscroll: jest.fn(),
}))
jest.mock('zss/feature/bookmarks', () => ({
  BOOKMARK_SCROLL_CHIP: 'bookmarkscroll',
  EDITOR_BOOKMARK_SCROLL_CHIP: 'editorbookmarkscroll',
  normalizebookmarks: jest.fn((raw: unknown) => raw),
}))

describe('handlebookmarkscroll', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    jest.mocked(memorybookmarkscroll).mockClear()
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('without MAIN creates the book then opens bookmark scroll', () => {
    expect(memoryreadbookbysoftware(MEMORY_LABEL.MAIN)).toBeUndefined()
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: 'bookmarkscroll',
      data: [[{ kind: 'url', id: 'u1', name: 'n', href: 'https://x' }], []],
    }
    handlebookmarkscroll(vm, message)
    expect(memoryreadbookbysoftware(MEMORY_LABEL.MAIN)).toBeDefined()
    expect(memorybookmarkscroll).toHaveBeenCalled()
  })
})

describe('handlebookmarkscrollpanel', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    jest.mocked(registerbookmarkurlnavigate).mockClear()
    jest.mocked(registerbookmarkdelete).mockClear()
    jest.mocked(vmclearscroll).mockClear()
    jest.mocked(registerbookmarkurlsave).mockClear()
    jest.mocked(registerbookmarkurlsaveover).mockClear()
    jest.mocked(registerbookmarkcodepagecopytogame).mockClear()
    jest.mocked(apitoast).mockClear()
    jest.mocked(memorymainbookisempty).mockReturnValue(false)
  })

  it('bookmarksave toasts and skips when MAIN is empty', () => {
    jest.mocked(memorymainbookisempty).mockReturnValue(true)
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: undefined,
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarksave')
    expect(registerbookmarkurlsave).not.toHaveBeenCalled()
    expect(apitoast).toHaveBeenCalledWith(
      vm,
      'p1',
      'bookmark save: main book is empty',
    )
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

  it('bookmarkdel opens confirm prompt instead of deleting', () => {
    jest.mocked(memorybookmarkdeleteprompt).mockClear()
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: ['abc-id'],
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarkdel')
    expect(memorybookmarkdeleteprompt).toHaveBeenCalledWith(
      'p1',
      'abc-id',
      'bookmarkscroll',
    )
    expect(registerbookmarkdelete).not.toHaveBeenCalled()
  })

  it('bookmarkdelconfirm calls registerbookmarkdelete', () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: ['abc-id'],
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarkdelconfirm')
    expect(registerbookmarkdelete).toHaveBeenCalledWith(vm, 'p1', 'abc-id')
  })

  it('bookmarkdel uses string data when not an array', () => {
    jest.mocked(memorybookmarkdeleteprompt).mockClear()
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: 'xyz-id',
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarkdel')
    expect(memorybookmarkdeleteprompt).toHaveBeenCalledWith(
      'p1',
      'xyz-id',
      'bookmarkscroll',
    )
    expect(registerbookmarkdelete).not.toHaveBeenCalled()
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
    expect(vmclearscroll).not.toHaveBeenCalled()
  })

  it('bookmarksaveover calls registerbookmarkurlsaveover', () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: ['url-id'],
    }
    handlebookmarkscrollpanel(vm, message, 'bookmarksaveover')
    expect(registerbookmarkurlsaveover).toHaveBeenCalledWith(vm, 'p1', 'url-id')
  })

  it('editorbookmarkdel opens confirm prompt instead of deleting', () => {
    jest.mocked(memorybookmarkdeleteprompt).mockClear()
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: ['ed-id'],
    }
    handlebookmarkscrollpanel(vm, message, 'editorbookmarkdel')
    expect(memorybookmarkdeleteprompt).toHaveBeenCalledWith(
      'p1',
      'ed-id',
      'bookmarkscroll',
    )
    expect(registerbookmarkdelete).not.toHaveBeenCalled()
  })

  it('editorbookmarkurl calls registerbookmarkcodepagecopytogame', () => {
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: ['ed-id'],
    }
    handlebookmarkscrollpanel(vm, message, 'editorbookmarkurl')
    expect(registerbookmarkcodepagecopytogame).toHaveBeenCalledWith(
      vm,
      'p1',
      'ed-id',
    )
  })
})
