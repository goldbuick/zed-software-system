import type { DEVICE } from 'zss/device'
import type { MESSAGE, VM_BOARDRUNNER_TRANSFER } from 'zss/device/api'
import { handleboardrunnertransfer } from 'zss/device/vm/handlers/boardrunnertransfer'
import {
  memorysyncupdateboard,
  memorysyncupdatememory,
} from 'zss/device/vm/memorysync'
import { ackboardrunners } from 'zss/device/vm/state'
import {
  memorywriteboardnamed,
  memorywriteboardobjectlookup,
} from 'zss/memory/boardlookup'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memorywritebookflag } from 'zss/memory/bookoperations'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memorymarkboarddirty } from 'zss/memory/memorydirty'
import {
  memorymoveplayertoboard,
  memorywritebookplayerboard,
} from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
}))

jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    apilog: jest.fn(),
  }
})

jest.mock('zss/device/vm/memorysync', () => ({
  memorysyncupdateboard: jest.fn(),
  memorysyncupdatememory: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbookbysoftware: jest.fn(),
}))

jest.mock('zss/memory/boards', () => ({
  memoryreadboardbyaddress: jest.fn(),
}))

jest.mock('zss/memory/boardlookup', () => ({
  memorywriteboardnamed: jest.fn(),
  memorywriteboardobjectlookup: jest.fn(),
}))

jest.mock('zss/memory/bookoperations', () => ({
  memorywritebookflag: jest.fn(),
}))

jest.mock('zss/memory/memorydirty', () => ({
  memorymarkboarddirty: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memorymoveplayertoboard: jest.fn(() => true),
  memorywritebookplayerboard: jest.fn(),
}))

jest.mock('zss/memory/codepages', () => ({
  memorypickcodepagewithtypeandstat: jest.fn(),
}))

function clearrunners() {
  for (const k of Object.keys(ackboardrunners)) {
    delete ackboardrunners[k]
  }
}

function makepayload(
  overrides: Partial<VM_BOARDRUNNER_TRANSFER> = {},
): VM_BOARDRUNNER_TRANSFER {
  return {
    player: 'player-1',
    fromboardid: 'board-a',
    toboardid: 'board-b',
    element: { id: 'player-1', kind: 'player', x: 0, y: 0, char: 2 },
    dest: { x: 10, y: 20 },
    ...overrides,
  }
}

describe('handleboardrunnertransfer', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    clearrunners()
    jest.clearAllMocks()
  })

  afterEach(() => {
    clearrunners()
  })

  it('ignores non-runner emitters (message.player != ackboardrunners[from])', () => {
    ackboardrunners['board-a'] = 'runner-a'
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue({})
    ;(memoryreadboardbyaddress as jest.Mock).mockReturnValue({
      id: 'board-b',
      objects: {},
    })

    const message = {
      player: 'impostor',
      data: makepayload(),
    } as unknown as MESSAGE

    handleboardrunnertransfer(vm, message)

    expect(memorywriteboardnamed).not.toHaveBeenCalled()
    expect(memorymoveplayertoboard).not.toHaveBeenCalled()
    expect(memorysyncupdatememory).not.toHaveBeenCalled()
  })

  it('drops silently on invalid payload', () => {
    ackboardrunners['board-a'] = 'runner-a'
    const message = {
      player: 'runner-a',
      data: { player: 'p1' },
    } as unknown as MESSAGE
    handleboardrunnertransfer(vm, message)
    expect(memorywriteboardnamed).not.toHaveBeenCalled()
    expect(memorymoveplayertoboard).not.toHaveBeenCalled()
  })

  it('falls back to memorymoveplayertoboard when destination has no elected runner', () => {
    ackboardrunners['board-a'] = 'runner-a'
    // no ackboardrunners['board-b']
    const book = {}
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    ;(memoryreadboardbyaddress as jest.Mock).mockReturnValue({
      id: 'board-b',
      objects: {},
    })

    const payload = makepayload()
    const message = {
      player: 'runner-a',
      data: payload,
    } as unknown as MESSAGE

    handleboardrunnertransfer(vm, message)

    expect(memorymoveplayertoboard).toHaveBeenCalledWith(
      book,
      'player-1',
      'board-b',
      { x: 10, y: 20 },
    )
    expect(memorywriteboardnamed).not.toHaveBeenCalled()
  })

  it('inserts element on destination and updates flags when dest has a runner', () => {
    ackboardrunners['board-a'] = 'runner-a'
    ackboardrunners['board-b'] = 'runner-b'
    const book = {}
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    const destboard = { id: 'board-b', objects: {} as Record<string, unknown> }
    ;(memoryreadboardbyaddress as jest.Mock).mockReturnValue(destboard)
    const destcodepage = { id: 'board-b' }
    ;(memorypickcodepagewithtypeandstat as jest.Mock).mockReturnValue(
      destcodepage,
    )

    const payload = makepayload()
    const message = {
      player: 'runner-a',
      data: payload,
    } as unknown as MESSAGE

    handleboardrunnertransfer(vm, message)

    expect(destboard.objects['player-1']).toEqual({
      id: 'player-1',
      kind: 'player',
      x: 10,
      y: 20,
      char: 2,
    })
    expect(memorywriteboardnamed).toHaveBeenCalled()
    expect(memorywriteboardobjectlookup).toHaveBeenCalled()
    expect(memorymarkboarddirty).toHaveBeenCalledWith(destboard)
    expect(memorywritebookflag).toHaveBeenCalledWith(
      book,
      'player-1',
      'enterx',
      10,
    )
    expect(memorywritebookflag).toHaveBeenCalledWith(
      book,
      'player-1',
      'entery',
      20,
    )
    expect(memorywritebookplayerboard).toHaveBeenCalledWith(
      book,
      'player-1',
      'board-b',
    )
    expect(memorysyncupdatememory).toHaveBeenCalled()
    expect(memorysyncupdateboard).toHaveBeenCalledWith(destcodepage)
    // must NOT call the in-process fallback when destination is owned
    expect(memorymoveplayertoboard).not.toHaveBeenCalled()
  })

  it('handles missing destination board gracefully', () => {
    ackboardrunners['board-a'] = 'runner-a'
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue({})
    ;(memoryreadboardbyaddress as jest.Mock).mockReturnValue(undefined)

    const message = {
      player: 'runner-a',
      data: makepayload(),
    } as unknown as MESSAGE
    handleboardrunnertransfer(vm, message)

    expect(memorywriteboardnamed).not.toHaveBeenCalled()
    expect(memorymoveplayertoboard).not.toHaveBeenCalled()
  })
})
