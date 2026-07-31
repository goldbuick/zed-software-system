import type { DEVICE } from 'zss/device'
import { handlebuildboard } from 'zss/device/vm/handlers/buildboard'
import { pttoindex } from 'zss/mapping/2d'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryreadflags } from 'zss/memory/flags'
import {
  memoryreadboardelementruntime,
  memorywriteboardelementruntime,
} from 'zss/memory/runtimeboundary'
import { memoryresetbooks } from 'zss/memory/session'
import type { BOARD, BOARD_ELEMENT } from 'zss/memory/types'
import { BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { CATEGORY } from 'zss/words/types'

const boardrunnerpushupdates = jest.fn()
const apierror = jest.fn()

jest.mock('zss/device/vm/boardrunnerpushupdates', () => ({
  boardrunnerpushupdates: (...args: unknown[]) =>
    boardrunnerpushupdates(...args),
}))

jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    apierror: (...args: unknown[]) => apierror(...args),
  }
})

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 0,
    DRAW_CHAR_HEIGHT: () => 0,
  },
}))

function makewallterrain(x: number, y: number): BOARD_ELEMENT {
  const tile: BOARD_ELEMENT = {
    x,
    y,
    kind: 'wall',
    char: 219,
    color: 2,
    runtime: '',
  }
  memorywriteboardelementruntime(tile, {
    category: CATEGORY.ISTERRAIN,
    kinddata: { id: 'wall', name: 'wall', char: 219, runtime: '' },
  })
  return tile
}

function makeboard(name: string, terrainat?: BOARD_ELEMENT): BOARD {
  const terrain = new Array<BOARD_ELEMENT | undefined>(BOARD_SIZE)
  if (terrainat) {
    terrain[
      pttoindex({ x: terrainat.x ?? 0, y: terrainat.y ?? 0 }, BOARD_WIDTH)
    ] = terrainat
  }
  return {
    id: '',
    name,
    terrain,
    objects: {},
    runtime: '',
  }
}

function setupbooks(pages: ReturnType<typeof memorycreatecodepage>[]) {
  const book = memorycreatebook(pages)
  book.name = 'main'
  memoryresetbooks([book])
  return book
}

describe('handlebuildboard', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.book = undefined
    boardrunnerpushupdates.mockClear()
    apierror.mockClear()
  })

  it('clones source and sets bidirectional exit links', () => {
    const wall = makewallterrain(0, 0)
    const hubboard = makeboard('hubboard', wall)
    const currentboard = makeboard('here')
    const wallcp = memorycreatecodepage('@terrain wall\n', {
      terrain: { id: 'wall', name: 'wall', kind: 'wall', runtime: '' },
    })
    const hubcp = memorycreatecodepage('@board hubboard\n', {
      board: hubboard,
    })
    const currentcp = memorycreatecodepage('@board here\n', {
      board: currentboard,
    })
    const book = setupbooks([wallcp, hubcp, currentcp])
    const pagecountbefore = book.pages.length

    const vm = { emit: jest.fn() } as unknown as DEVICE
    handlebuildboard(vm, {
      player: 'pid_builder',
      data: [currentcp.id, 'el1', 'exitsouth', 'hubboard'],
    } as never)

    expect(apierror).not.toHaveBeenCalled()
    expect(boardrunnerpushupdates).toHaveBeenCalledWith(vm)
    expect(book.pages.length).toBe(pagecountbefore + 1)

    const newid = currentboard.exitsouth
    expect(newid).toBeTruthy()
    expect(newid).not.toBe(hubcp.id)

    const resolved = memoryreadboardbyaddress(newid!)
    expect(resolved?.exitnorth).toBe(currentcp.id)
    expect(resolved?.terrain[0]?.char).toBe(219)
    expect(
      memoryreadboardelementruntime(resolved!.terrain[0]!)?.kinddata?.name,
    ).toBe('wall')
  })

  it('creates blank board with exit back-link when no source', () => {
    const currentboard = makeboard('here')
    const currentcp = memorycreatecodepage('@board here\n', {
      board: currentboard,
    })
    setupbooks([currentcp])

    const vm = { emit: jest.fn() } as unknown as DEVICE
    handlebuildboard(vm, {
      player: 'pid_builder',
      data: [currentcp.id, 'el1', 'exitsouth', undefined],
    } as never)

    expect(apierror).not.toHaveBeenCalled()
    const newid = currentboard.exitsouth
    expect(newid).toBeTruthy()

    const resolved = memoryreadboardbyaddress(newid!)
    expect(resolved?.exitnorth).toBe(currentcp.id)
    expect(boardrunnerpushupdates).toHaveBeenCalledWith(vm)
  })

  it('fails loud when source board is missing', () => {
    const currentboard = makeboard('here')
    const currentcp = memorycreatecodepage('@board here\n', {
      board: currentboard,
    })
    const book = setupbooks([currentcp])
    const pagecountbefore = book.pages.length

    const vm = { emit: jest.fn() } as unknown as DEVICE
    handlebuildboard(vm, {
      player: 'pid_builder',
      data: [currentcp.id, 'el1', 'exitsouth', 'missingboard'],
    } as never)

    expect(apierror).toHaveBeenCalled()
    expect(currentboard.exitsouth).toBeUndefined()
    expect(book.pages.length).toBe(pagecountbefore)
    expect(boardrunnerpushupdates).not.toHaveBeenCalled()
  })

  it('stores new board id in player flags for non-exit stats', () => {
    const hubboard = makeboard('hubboard')
    const currentboard = makeboard('here')
    const hubcp = memorycreatecodepage('@board hubboard\n', {
      board: hubboard,
    })
    const currentcp = memorycreatecodepage('@board here\n', {
      board: currentboard,
    })
    setupbooks([hubcp, currentcp])

    const vm = { emit: jest.fn() } as unknown as DEVICE
    handlebuildboard(vm, {
      player: 'pid_builder',
      data: [currentcp.id, 'el1', 'myroom', 'hubboard'],
    } as never)

    expect(apierror).not.toHaveBeenCalled()
    expect(currentboard.exitsouth).toBeUndefined()
    const flags = memoryreadflags('pid_builder')
    expect(typeof flags.myroom).toBe('string')
    expect(flags.myroom).toBeTruthy()
    expect(flags.myroom).not.toBe(hubcp.id)
  })

  it('writes standard element stats onto the invoking object', () => {
    const hubboard = makeboard('hubboard')
    const currentboard = makeboard('here')
    currentboard.objects.el1 = {
      id: 'el1',
      name: 'builder',
      kind: 'object',
      x: 1,
      y: 1,
      runtime: '',
    }
    const hubcp = memorycreatecodepage('@board hubboard\n', {
      board: hubboard,
    })
    const currentcp = memorycreatecodepage('@board here\n', {
      board: currentboard,
    })
    setupbooks([hubcp, currentcp])

    const vm = { emit: jest.fn() } as unknown as DEVICE
    handlebuildboard(vm, {
      player: 'pid_builder',
      data: [currentcp.id, 'el1', 'p1', 'hubboard'],
    } as never)

    expect(apierror).not.toHaveBeenCalled()
    expect(currentboard.objects.el1.p1).toBeTruthy()
    expect(currentboard.objects.el1.p1).not.toBe(hubcp.id)
    expect(memoryreadflags('pid_builder').p1).toBeUndefined()
    expect(boardrunnerpushupdates).toHaveBeenCalledWith(vm)
  })

  it('fails loud when standard element stat has missing element', () => {
    const hubboard = makeboard('hubboard')
    const currentboard = makeboard('here')
    const hubcp = memorycreatecodepage('@board hubboard\n', {
      board: hubboard,
    })
    const currentcp = memorycreatecodepage('@board here\n', {
      board: currentboard,
    })
    const book = setupbooks([hubcp, currentcp])
    const pagecountbefore = book.pages.length

    const vm = { emit: jest.fn() } as unknown as DEVICE
    handlebuildboard(vm, {
      player: 'pid_builder',
      data: [currentcp.id, 'missingel', 'p1', 'hubboard'],
    } as never)

    expect(apierror).toHaveBeenCalled()
    expect(book.pages.length).toBe(pagecountbefore)
    expect(memoryreadflags('pid_builder').p1).toBeUndefined()
    expect(boardrunnerpushupdates).not.toHaveBeenCalled()
  })
})
