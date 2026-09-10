import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
  memorydeleteboardobject,
  memorywriteterrain,
} from 'zss/memory/boardlifecycle'
import {
  memoryensureboardready,
  memoryinitboardnamed,
} from 'zss/memory/boardlookup'
import { memorymoveboardobject } from 'zss/memory/boardmovement'
import {
  memoryclearelementkinddata,
  memoryreadelementkind,
} from 'zss/memory/boards'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryresetcodepagestats,
} from 'zss/memory/codepageoperations'
import {
  memoryinvalidatecodepagepickcache,
  memoryreadcodepagepickcache,
} from 'zss/memory/codepagepickcache'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memoryreadobjectatpt } from 'zss/memory/boardaccess'
import { memoryresetbooks } from 'zss/memory/session'
import { BOARD_WIDTH, CODE_PAGE_TYPE } from 'zss/memory/types'
import { CATEGORY } from 'zss/words/types'

describe('memoryreadelementkind kinddata refresh', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('rebuilds kinddata when codepage.code changes after make-it stub', () => {
    const page = memorycreatecodepage('@widget\n', {})
    const book = memorycreatebook([page])
    memoryresetbooks([book])

    const board = memorycreateboard()
    const object = memorycreateboardobjectfromkind(
      board,
      { x: 1, y: 1 },
      'widget',
    )
    expect(object).toBeDefined()
    object!.category = CATEGORY.ISOBJECT

    const stub = memoryreadelementkind(object)
    expect(stub?.code).toBe('@widget\n')

    page.code = ['@widget', '@char 42', '@color 3', ''].join('\n')
    memoryresetcodepagestats(page)

    const refreshed = memoryreadelementkind(object)
    expect(refreshed?.code).toContain('@char 42')
    expect(refreshed?.char).toBe(42)
    expect(refreshed?.color).toBe(3)
  })

  it('second read skips pick when kinddata is warm and fresh', () => {
    const page = memorycreatecodepage('@wall\n@char 178\n', {})
    const book = memorycreatebook([page])
    memoryresetbooks([book])

    const board = memorycreateboard()
    const object = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'wall',
    )
    expect(object).toBeDefined()

    const first = memoryreadelementkind(object)
    expect(first?.char).toBe(178)
    expect(object?.kindsourcepageid).toBe(page.id)

    memoryinvalidatecodepagepickcache()
    const second = memoryreadelementkind(object)
    expect(second).toBe(first)
    // Pick cache still empty — hot path never called pick.
    expect(memoryreadcodepagepickcache(CODE_PAGE_TYPE.OBJECT, 'wall').hit).toBe(
      false,
    )
  })

  it('cold resolves again after kind string changes', () => {
    const wall = memorycreatecodepage('@wall\n@char 1\n', {})
    const floor = memorycreatecodepage('@floor\n@char 2\n', {})
    memoryresetbooks([memorycreatebook([wall, floor])])

    const board = memorycreateboard()
    const object = memorycreateboardobjectfromkind(
      board,
      { x: 0, y: 0 },
      'wall',
    )
    expect(memoryreadelementkind(object)?.char).toBe(1)

    object!.kind = 'floor'
    memoryclearelementkinddata(object)
    expect(memoryreadelementkind(object)?.char).toBe(2)
  })
})

describe('codepage pick cache', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('invalidates on memoryresetcodepagestats', () => {
    const page = memorycreatecodepage('@torch\n', {})
    memoryresetbooks([memorycreatebook([page])])
    expect(
      memorypickcodepagewithtypeandstat(CODE_PAGE_TYPE.OBJECT, 'torch')?.id,
    ).toBe(page.id)
    expect(
      memoryreadcodepagepickcache(CODE_PAGE_TYPE.OBJECT, 'torch').hit,
    ).toBe(true)

    memoryresetcodepagestats(page)
    expect(
      memoryreadcodepagepickcache(CODE_PAGE_TYPE.OBJECT, 'torch').hit,
    ).toBe(false)
  })
})

describe('board object occupancy', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('spawn move delete keep occupancy without named reset', () => {
    const page = memorycreatecodepage('@crate\n', {})
    memoryresetbooks([memorycreatebook([page])])

    const board = memorycreateboard()
    memoryensureboardready(board)

    const object = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 4 },
      'crate',
    )
    expect(object?.id).toBeDefined()
    expect(memoryreadobjectatpt(board, { x: 3, y: 4 })?.id).toBe(object!.id)

    const blocked = memorymoveboardobject(board, object, { x: 4, y: 4 })
    expect(blocked).toBeUndefined()
    expect(memoryreadobjectatpt(board, { x: 3, y: 4 })).toBeUndefined()
    expect(memoryreadobjectatpt(board, { x: 4, y: 4 })?.id).toBe(object!.id)

    memorydeleteboardobject(board, object!.id!)
    expect(memoryreadobjectatpt(board, { x: 4, y: 4 })).toBeUndefined()
    expect(board.objects[object!.id!]).toBeUndefined()
  })

  it('memorywriteterrain updates named index', () => {
    const page = memorycreatecodepage('@water\n', {})
    memoryresetbooks([memorycreatebook([page])])

    const board = memorycreateboard()
    memoryensureboardready(board)

    memorywriteterrain(board, { x: 1, y: 1, kind: 'water' })
    const named = board.named?.water
    expect(named?.has(1 + 1 * BOARD_WIDTH)).toBe(true)
  })

  it('memoryensureboardready is lazy when named exists', () => {
    const board = memorycreateboard()
    memoryinitboardnamed(board)
    const before = board.named
    memoryensureboardready(board)
    expect(board.named).toBe(before)
  })
})
