jest.mock('zss/config', () => ({
  PERF_UI: false,
}))

jest.mock('zss/device/api', () => ({
  boardrunnerpatch: jest.fn(),
  gadgetclientpatch: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbookbysoftware: jest.fn(),
  memoryreadoperator: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memoryreadplayerboard: jest.fn(),
}))

jest.mock('zss/memory/rendering', () => ({
  memoryreadgraphics: jest.fn(() => ({ graphics: 'iso' })),
  memoryconverttogadgetcontrollayer: jest.fn(() => ['control']),
  MEMORY_GADGET_LAYERS: {},
}))

jest.mock('zss/memory/gadgetlayersflags', () => ({
  memoryreadbookgadgetlayersforboard: jest.fn(() => ({
    iso: {
      id: 'board-1',
      board: 'board-1',
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
      over: [],
      under: [],
      layers: ['layer-a'],
      tickers: [],
    },
  })),
}))

jest.mock('zss/memory/synthstate', () => ({
  memoryreadsynth: jest.fn(() => ({})),
}))

jest.mock('zss/memory/bookoperations', () => ({
  memoryreadbookflag: jest.fn(),
  memorywritebookflag: jest.fn(),
}))

jest.mock('zss/gadget/data/api', () => ({
  gadgetstate: jest.fn(() => ({
    id: '',
    board: '',
    exiteast: '',
    exitwest: '',
    exitnorth: '',
    exitsouth: '',
    exitne: '',
    exitnw: '',
    exitse: '',
    exitsw: '',
    over: [],
    under: [],
    layers: [],
    tickers: [],
    sidebar: [],
    boardname: '',
    synthstate: {},
  })),
  gadgetstateprovider: jest.fn(),
  initstate: jest.fn(() => ({})),
}))

jest.mock('zss/gadget/graphics/layerz', () => ({
  normalizelayerzvariant: jest.fn((v) => v),
}))

jest.mock('zss/mapping/guid', () => ({
  creategadgetid: jest.fn((p) => `gadget-${p}`),
  ispid: jest.fn(() => true),
}))

import type { DEVICE } from 'zss/device'
import { gadgetclientpatch } from 'zss/device/api'
import { gadgetsynctick } from 'zss/device/vm/gadgetsynctick'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import {
  memoryreadbookbysoftware,
  memoryreadoperator,
} from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'

const stubbook: BOOK = {
  id: 'main',
  name: 'main',
  timestamp: 0,
  activelist: ['p1'],
  pages: [],
  flags: {},
}

describe('gadgetsynctick', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    jest.mocked(memoryreadbookbysoftware).mockReturnValue(stubbook)
    jest.mocked(memoryreadoperator).mockReturnValue('p1')
    jest.mocked(memoryreadplayerboard).mockReturnValue({
      id: 'board-1',
      name: 'Test Board',
    } as ReturnType<typeof memoryreadplayerboard> extends infer T
      ? NonNullable<T>
      : never)
    jest.mocked(gadgetclientpatch).mockClear()
  })

  it('skips when main book is missing', () => {
    jest.mocked(memoryreadbookbysoftware).mockReturnValue(undefined)
    gadgetsynctick(vm)
    expect(gadgetclientpatch).not.toHaveBeenCalled()
  })

  it('skips when operator is unset', () => {
    jest.mocked(memoryreadoperator).mockReturnValue('')
    gadgetsynctick(vm)
    expect(gadgetclientpatch).not.toHaveBeenCalled()
  })

  it('emits gadget patch for active players and skips when unchanged', () => {
    gadgetsynctick(vm)
    expect(gadgetclientpatch).toHaveBeenCalled()
    const [, player] = jest.mocked(gadgetclientpatch).mock.calls[0]
    expect(player).toBe('p1')
    jest.mocked(gadgetclientpatch).mockClear()
    gadgetsynctick(vm)
    expect(gadgetclientpatch).not.toHaveBeenCalled()
  })
})
