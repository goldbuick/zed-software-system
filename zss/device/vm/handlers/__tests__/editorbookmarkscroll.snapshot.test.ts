import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  registerbookmarkcodepagesave,
  registerbookmarkdelete,
} from 'zss/device/api'
import {
  handleeditorbookmarkscroll,
  handleeditorbookmarkscrollpanel,
} from 'zss/device/vm/handlers/editorbookmarkscroll'
import type { ZssEditorBookmark } from 'zss/feature/bookmarks'
import { memoryreadcodepagebyid } from 'zss/memory/codepages'
import { memoryeditorbookmarkscroll } from 'zss/memory/editorbookmarkscroll'

jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    registerbookmarkcodepagesave: jest.fn(),
    registerbookmarkdelete: jest.fn(),
  }
})

jest.mock('zss/memory/editorbookmarkscroll', () => {
  const actual = jest.requireActual('zss/memory/editorbookmarkscroll')
  return {
    ...actual,
    memoryeditorbookmarkscroll: jest.fn(),
  }
})

jest.mock('zss/memory/codepages', () => ({
  memoryreadcodepagebyid: jest.fn(),
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
  })

  it('passes normalized editor list and path to memory and caches', () => {
    handleeditorbookmarkscroll(vm, {
      ...base,
      data: [[editbookmark], 'page-name', ['a', 'b']],
    })
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

  it('editorbookmarkdel calls registerbookmarkdelete', () => {
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['bid1'] },
      'editorbookmarkdel',
    )
    expect(registerbookmarkdelete).toHaveBeenCalledWith(vm, player, 'bid1')
  })

  it('editorbookmarkdelconfirm does not call registerbookmarkdelete', () => {
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['bid1'] },
      'editorbookmarkdelconfirm',
    )
    expect(registerbookmarkdelete).not.toHaveBeenCalled()
  })

  it('editorbookmarkdelcancel does not call memoryeditorbookmarkscroll', () => {
    jest.mocked(memoryeditorbookmarkscroll).mockClear()
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['-'] },
      'editorbookmarkdelcancel',
    )
    expect(memoryeditorbookmarkscroll).not.toHaveBeenCalled()
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
    jest.mocked(memoryreadcodepagebyid).mockReset()
  })

  it('registerbookmarkcodepagesave when first data arg is a codepage id', () => {
    jest.mocked(memoryreadcodepagebyid).mockReturnValue(fakecodepage as any)
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['cp1'] },
      'snapshotcurrent',
    )
    expect(registerbookmarkcodepagesave).toHaveBeenCalled()
  })

  it('no registerbookmarkcodepagesave when codepage missing', () => {
    jest.mocked(memoryreadcodepagebyid).mockReturnValue(undefined)
    handleeditorbookmarkscrollpanel(
      vm,
      { ...base, data: ['missing'] },
      'snapshotcurrent',
    )
    expect(registerbookmarkcodepagesave).not.toHaveBeenCalled()
  })
})
