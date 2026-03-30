import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apitoast, vmcodepagesnapshot } from 'zss/device/api'
import { handleeditorbookmarkscrollpanel } from 'zss/device/vm/handlers/editorbookmarkscroll'
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
