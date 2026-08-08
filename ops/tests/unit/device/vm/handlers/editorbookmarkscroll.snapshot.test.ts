import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  registerbookmarkcodepagesave,
  registerbookmarkcodepagesaveover,
  registerbookmarkdelete,
} from 'zss/device/api'
import {
  handleeditorbookmarkscroll,
  handleeditorbookmarkscrollpanel,
} from 'zss/device/vm/handlers/editorbookmarkscroll'
import type { ZssEditorBookmark } from 'zss/feature/bookmarks'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import { memoryreadcodepagebyaddress } from 'zss/memory/codepages'
import { memoryeditorbookmarkscroll } from 'zss/memory/editorbookmarkscroll'
import { memorybookmarkdeleteprompt } from 'zss/memory/bookmarkdeleteconfirm'
import {
  memoryreadbookbysoftware,
  memoryresetbooks,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    registerbookmarkcodepagesave: jest.fn(),
    registerbookmarkcodepagesaveover: jest.fn(),
    registerbookmarkdelete: jest.fn(),
    apilog: jest.fn(),
  }
})

jest.mock('zss/memory/editorbookmarkscroll', () => {
  const actual = jest.requireActual('zss/memory/editorbookmarkscroll')
  return {
    ...actual,
    memoryeditorbookmarkscroll: jest.fn(),
  }
})

jest.mock('zss/memory/bookmarkdeleteconfirm', () => ({
  memorybookmarkdeleteprompt: jest.fn(() => true),
  memoryreadbookmarklistcache: jest.fn(() => ({
    source: 'editorbookmarkscroll',
    editorlist: [],
    codepagename: 'page-name',
    codepagepath: ['x'],
  })),
  memorycacheeditorbookmarkscrolllist: jest.fn(),
}))

jest.mock('zss/gadget/data/api', () => ({
  gadgetclearscroll: jest.fn(),
}))

jest.mock('zss/memory/bookmarkscroll', () => ({
  memorybookmarkscroll: jest.fn(),
  memorymainbookisempty: jest.fn(() => false),
}))

jest.mock('zss/memory/codepages', () => ({
  memoryreadcodepagebyaddress: jest.fn(),
  memoryreadcodepagebyid: jest.fn(),
}))

jest.mock('zss/memory/codepageoperations', () => ({
  memoryreadcodepagename: jest.fn(() => 'page-name'),
  memoryreadcodepagetypeasstring: jest.fn(() => 'board'),
}))

const editbookmark: ZssEditorBookmark = {
  kind: 'editor',
  id: 'bid1',
  type: 'board',
  title: 'My saved page',
  codepage: { id: 'cp1', code: '' },
  createdat: 1,
}

describe('handleeditorbookmarkscroll', () => {
  const vm = {} as DEVICE
  const player = 'p1'
  const base: MESSAGE = {
    session: 's',
    player,
    id: 'id',
    sender: 'vm',
    target: 'editorbookmarkscroll',
    data: undefined,
  }

  beforeEach(() => {
    jest.mocked(memoryeditorbookmarkscroll).mockClear()
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('without MAIN creates the book then opens editor bookmark scroll', () => {
    expect(memoryreadbookbysoftware(MEMORY_LABEL.MAIN)).toBeUndefined()
    handleeditorbookmarkscroll(vm, {
      ...base,
      data: [[editbookmark], 'page-name', ['a', 'b']],
    })
    expect(memoryreadbookbysoftware(MEMORY_LABEL.MAIN)).toBeDefined()
    expect(memoryeditorbookmarkscroll).toHaveBeenCalledWith(
      player,
      expect.arrayContaining([
        expect.objectContaining({ id: 'bid1', kind: 'editor' }),
      ]),
      'page-name',
      ['a', 'b'],
    )
  })

  it('no-ops when data is not a valid tuple', () => {
    handleeditorbookmarkscroll(vm, { ...base, data: [] })
    expect(memoryeditorbookmarkscroll).not.toHaveBeenCalled()
  })
})

describe('handleeditorbookmarkscrollpanel delete flow', () => {
  const vm = {} as DEVICE
  const player = 'p1'
  const base: MESSAGE = {
    session: 's',
    player,
    id: 'id',
    sender: 'vm',
    target: 'default',
    data: undefined,
  }

  beforeEach(() => {
    jest.mocked(memoryeditorbookmarkscroll).mockClear()
    jest.mocked(registerbookmarkdelete).mockClear()
    handleeditorbookmarkscroll(vm, {
      ...base,
      target: 'editorbookmarkscroll',
      data: [[editbookmark], 'page-name', ['x']],
    })
  })

  it('editorbookmarkdel opens confirm prompt instead of deleting', () => {
    jest.mocked(memorybookmarkdeleteprompt).mockClear()
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['bid1'] },
      'editorbookmarkdel',
    )
    expect(memorybookmarkdeleteprompt).toHaveBeenCalledWith(
      player,
      'bid1',
      'editorbookmarkscroll',
    )
    expect(registerbookmarkdelete).not.toHaveBeenCalled()
  })

  it('editorbookmarkdelconfirm calls registerbookmarkdelete', () => {
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['bid1'] },
      'editorbookmarkdelconfirm',
    )
    expect(registerbookmarkdelete).toHaveBeenCalledWith(vm, player, 'bid1')
  })

  it('editorbookmarkdelcancel restores editor bookmark list', () => {
    jest.mocked(memoryeditorbookmarkscroll).mockClear()
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['-'] },
      'editorbookmarkdelcancel',
    )
    expect(memoryeditorbookmarkscroll).toHaveBeenCalled()
  })
})

describe('handleeditorbookmarkscrollpanel snapshotcurrent', () => {
  const vm = {} as DEVICE
  const player = 'p1'
  const base: MESSAGE = {
    session: 's',
    player,
    id: 'id',
    sender: 'vm',
    target: 'default',
    data: undefined,
  }

  const fakecodepage = { id: 'cp1', code: 'say hi' }

  beforeEach(() => {
    jest.mocked(registerbookmarkcodepagesave).mockClear()
    jest.mocked(memoryreadcodepagebyaddress).mockReset()
  })

  it('registerbookmarkcodepagesave when first data arg is a codepage id', () => {
    jest
      .mocked(memoryreadcodepagebyaddress)
      .mockReturnValue(fakecodepage as any)
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['cp1'] },
      'snapshotcurrent',
    )
    expect(registerbookmarkcodepagesave).toHaveBeenCalled()
  })

  it('no registerbookmarkcodepagesave when codepage missing', () => {
    jest.mocked(memoryreadcodepagebyaddress).mockReturnValue(undefined)
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['missing'] },
      'snapshotcurrent',
    )
    expect(registerbookmarkcodepagesave).not.toHaveBeenCalled()
  })
})

describe('handleeditorbookmarkscrollpanel editorsaveover', () => {
  const vm = {} as DEVICE
  const player = 'p1'
  const base: MESSAGE = {
    session: 's',
    player,
    id: 'id',
    sender: 'vm',
    target: 'default',
    data: undefined,
  }

  const fakecodepage = { id: 'cp1', code: 'say hi' }

  beforeEach(() => {
    jest.mocked(registerbookmarkcodepagesaveover).mockClear()
    jest.mocked(memoryreadcodepagebyaddress).mockReset()
  })

  it('registerbookmarkcodepagesaveover with bookmark id and current page', () => {
    jest
      .mocked(memoryreadcodepagebyaddress)
      .mockReturnValue(fakecodepage as any)
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['bid1', 'cp1'] },
      'editorsaveover',
    )
    expect(registerbookmarkcodepagesaveover).toHaveBeenCalledWith(
      vm,
      player,
      'bid1',
      'board',
      'page-name',
      fakecodepage,
    )
  })

  it('no-ops when codepage missing', () => {
    jest.mocked(memoryreadcodepagebyaddress).mockReturnValue(undefined)
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['bid1', 'missing'] },
      'editorsaveover',
    )
    expect(registerbookmarkcodepagesaveover).not.toHaveBeenCalled()
  })
})
