import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apitoast, vmcodepagesnapshot } from 'zss/device/api'
import {
  handleeditorbookmarkscroll,
  handleeditorbookmarkscrollpanel,
} from 'zss/device/vm/handlers/editorbookmarkscroll'
import { EDITOR_BOOKMARK_SCROLL_OPENER_EMPTY } from 'zss/feature/bookmarks'
import { memoryeditorbookmarkscroll } from 'zss/memory/editorbookmarkscroll'
import { handletapeeditorclose } from 'zss/device/vm/handlers/tapeeditorclose'
import {
  tapeeditormirrorreset,
  tapeeditorset,
} from 'zss/device/vm/tapeeditormirror'

jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    apitoast: jest.fn(),
    vmcodepagesnapshot: jest.fn(),
  }
})

jest.mock('zss/memory/editorbookmarkscroll', () => ({
  memoryeditorbookmarkscroll: jest.fn(),
}))

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

  beforeEach(() => {
    tapeeditormirrorreset()
    jest.mocked(apitoast).mockClear()
    jest.mocked(vmcodepagesnapshot).mockClear()
    jest.mocked(memoryeditorbookmarkscroll).mockClear()
  })

  it('calls vmcodepagesnapshot from panel payload when message.data has book/pathjson/type/title', () => {
    const msg: MESSAGE = {
      ...base,
      data: ['main', JSON.stringify(['page-a', 'obj1']), 'board', 'Test title'],
    }
    handleeditorbookmarkscrollpanel(vm, msg, 'snapshotcurrent')
    expect(vmcodepagesnapshot).toHaveBeenCalledWith(
      vm,
      player,
      'main',
      ['page-a', 'obj1'],
      'board',
      'Test title',
    )
    expect(apitoast).not.toHaveBeenCalled()
  })

  it('calls vmcodepagesnapshot when tape mirror has an open editor', () => {
    tapeeditorset(player, {
      open: true,
      book: 'main',
      path: ['page-a', 'obj1'],
      type: 'board',
      title: 'Test title',
    })
    handleeditorbookmarkscrollpanel(vm, base, 'snapshotcurrent')
    expect(vmcodepagesnapshot).toHaveBeenCalledWith(
      vm,
      player,
      'main',
      ['page-a', 'obj1'],
      'board',
      'Test title',
    )
    expect(apitoast).not.toHaveBeenCalled()
  })

  it('toasts when mirror has no open codepage', () => {
    handleeditorbookmarkscrollpanel(vm, base, 'snapshotcurrent')
    expect(vmcodepagesnapshot).not.toHaveBeenCalled()
    expect(apitoast).toHaveBeenCalledWith(
      vm,
      player,
      'no codepage open to bookmark',
    )
  })

  it('toasts after handletapeeditorclose clears the mirror', () => {
    tapeeditorset(player, {
      open: true,
      book: 'main',
      path: ['id1'],
      type: '',
      title: 't',
    })
    handletapeeditorclose(vm, base)
    handleeditorbookmarkscrollpanel(vm, base, 'snapshotcurrent')
    expect(vmcodepagesnapshot).not.toHaveBeenCalled()
    expect(apitoast).toHaveBeenCalledWith(
      vm,
      player,
      'no codepage open to bookmark',
    )
  })
})

describe('handleeditorbookmarkscroll envelope', () => {
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

  it('passes editor list and opener from envelope to memory', () => {
    handleeditorbookmarkscroll(vm, {
      ...base,
      data: {
        editor: [],
        opener: {
          book: 'main',
          path: ['page1'],
          type: 'board',
          title: 'T',
        },
      },
    })
    expect(memoryeditorbookmarkscroll).toHaveBeenCalledWith(player, [], {
      book: 'main',
      path: ['page1'],
      type: 'board',
      title: 'T',
    })
  })

  it('uses empty editor and default opener when data is not an object envelope', () => {
    handleeditorbookmarkscroll(vm, { ...base, data: [] })
    expect(memoryeditorbookmarkscroll).toHaveBeenCalledWith(
      player,
      [],
      EDITOR_BOOKMARK_SCROLL_OPENER_EMPTY,
    )
  })
})
