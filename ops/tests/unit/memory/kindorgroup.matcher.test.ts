import { memoryevaldir } from 'zss/memory/boarddirection'
import {
  memoryelementmatchesstrgrouponboard,
  memorylistboardelementsbygroup,
} from 'zss/memory/boardlifecycle'
import { memoryinitboard } from 'zss/memory/boards'
import { memorywriteboardelementruntime } from 'zss/memory/runtimeboundary'
import { BOARD, BOARD_ELEMENT, BOARD_WIDTH } from 'zss/memory/types'
import { readtransformfilter } from 'zss/firmware/transforms'
import { readexpr } from 'zss/words/expr'
import { readgroup } from 'zss/words/group'
import { readkind } from 'zss/words/kind'
import { readargs, READ_CONTEXT } from 'zss/words/reader'
import { ARG_TYPE, CATEGORY, COLOR } from 'zss/words/types'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  DEBUG_SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 0,
    DRAW_CHAR_HEIGHT: () => 0,
  },
}))

jest.mock('zss/memory/boards', () => {
  const actual = jest.requireActual('zss/memory/boards')
  return {
    ...actual,
    memoryreadelementkind: (el: { kind?: string }) => {
      if (el.kind === 'bear' || el.kind === 'empty') {
        return { id: el.kind, name: el.kind, runtime: '' }
      }
      return undefined
    },
  }
})

function makeobject(
  id: string,
  x: number,
  y: number,
  opts: { name: string; group?: string },
): BOARD_ELEMENT {
  const el: BOARD_ELEMENT = {
    id,
    x,
    y,
    kind: opts.name,
    name: opts.name,
    group: opts.group,
    char: 1,
    color: 15,
    runtime: '',
  }
  memorywriteboardelementruntime(el, {
    category: CATEGORY.ISOBJECT,
    kinddata: {
      id: opts.name,
      name: opts.name,
      char: 1,
      runtime: '',
    },
  })
  return el
}

function makeboard(objects: BOARD_ELEMENT[], id = 'kindorgroupboard'): BOARD {
  const board = {
    id,
    terrain: Array.from({ length: BOARD_WIDTH * 25 }, () => undefined),
    objects: {} as Record<string, BOARD_ELEMENT>,
  } as BOARD
  for (let i = 0; i < objects.length; ++i) {
    const el = objects[i]
    if (el.id) {
      board.objects[el.id] = el
    }
  }
  memoryinitboard(board)
  return board
}

describe('readkind vs readgroup', () => {
  afterEach(() => {
    READ_CONTEXT.words = []
  })

  it('readkind rejects unknown blueprint names', () => {
    READ_CONTEXT.words = ['combat']
    const [kind, next] = readkind(0)
    expect(kind).toBeUndefined()
    expect(next).toBe(0)
  })

  it('readkind accepts registered kinds', () => {
    READ_CONTEXT.words = ['bear']
    const [kind, next] = readkind(0)
    expect(kind).toEqual(['bear', undefined])
    expect(next).toBe(1)
  })

  it('readgroup accepts unknown group names', () => {
    READ_CONTEXT.words = ['combat']
    const [group, next] = readgroup(0)
    expect(group).toEqual(['combat', undefined])
    expect(next).toBe(1)
  })

  it('readgroup accepts optional color prefix', () => {
    READ_CONTEXT.words = ['yellow', 'combat']
    const [group, next] = readgroup(0)
    expect(group?.[0]).toBe('combat')
    expect(group?.[1]).toEqual(['YELLOW'])
    expect(next).toBe(2)
  })

  it('ARG_TYPE.GROUP parses unknown names via readargs', () => {
    READ_CONTEXT.words = ['combat']
    const [group, next] = readargs(READ_CONTEXT.words, 0, [ARG_TYPE.GROUP])
    expect(group).toEqual(['combat', undefined])
    expect(next).toBe(1)
  })
})

describe('memorylistboardelementsbygroup', () => {
  it('includes @group members', () => {
    const lion = makeobject('sid_lion', 2, 2, {
      name: 'lion',
      group: 'combat',
    })
    const gem = makeobject('sid_gem', 4, 4, { name: 'gem' })
    const board = makeboard([lion, gem])
    const found = memorylistboardelementsbygroup(board, '', ['combat'])
    expect(found.map((el) => el.id)).toEqual(['sid_lion'])
  })

  it('applies optional color filter', () => {
    const yellow = makeobject('sid_yellow', 2, 2, {
      name: 'lion',
      group: 'combat',
    })
    yellow.color = COLOR.YELLOW
    const red = makeobject('sid_red', 3, 3, {
      name: 'bear',
      group: 'combat',
    })
    red.color = COLOR.RED
    const board = makeboard([yellow, red])
    const found = memorylistboardelementsbygroup(board, '', [
      'combat',
      ['YELLOW'],
    ])
    expect(found.map((el) => el.id)).toEqual(['sid_yellow'])
  })
})

describe('memoryelementmatchesstrgrouponboard', () => {
  it('matches @group on a single object', () => {
    const prey = makeobject('sid_prey', 5, 6, {
      name: 'bear',
      group: 'combat',
    })
    const board = makeboard([prey])
    expect(
      memoryelementmatchesstrgrouponboard(
        board,
        prey,
        '',
        ['combat'],
        false,
      ),
    ).toBe(true)
    expect(
      memoryelementmatchesstrgrouponboard(board, prey, '', ['gem'], false),
    ).toBe(false)
  })

  it('matches display name on a single object', () => {
    const prey = makeobject('sid_bear', 5, 6, { name: 'bear' })
    const board = makeboard([prey])
    expect(
      memoryelementmatchesstrgrouponboard(board, prey, '', ['bear'], false),
    ).toBe(true)
  })
})

describe('any DIR group match', () => {
  afterEach(() => {
    READ_CONTEXT.words = []
    READ_CONTEXT.board = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
  })

  it('matches @group at dest via any at x y', () => {
    const prey = makeobject('sid_prey', 5, 6, {
      name: 'bear',
      group: 'combat',
    })
    const self = makeobject('sid_self', 1, 1, { name: 'object' })
    const board = makeboard([prey, self], 'anygroupboard')
    READ_CONTEXT.board = board
    READ_CONTEXT.element = self
    READ_CONTEXT.elementid = self.id!
    READ_CONTEXT.words = ['any', 'at', 5, 6, 'combat']
    const [found] = readexpr(0)
    expect(found).toEqual([prey])
  })
})

describe('DIR.SELECT with GROUP', () => {
  it('does not throw when select shuffle has no matches', () => {
    const board = makeboard([], 'emptyselectboard')
    const element = makeobject('sid_self', 1, 1, { name: 'object' })
    board.objects[element.id!] = element
    memoryinitboard(board)
    const dir = ['SELECT', 'shuffle', ['nosuchgroup']] as any
    expect(() =>
      memoryevaldir(board, element, '', dir, { x: 1, y: 1 }),
    ).not.toThrow()
  })

  it('selects an @group member via inorder', () => {
    const prey = makeobject('sid_prey', 5, 6, {
      name: 'bear',
      group: 'combat',
    })
    const self = makeobject('sid_self2', 1, 1, { name: 'object' })
    const board = makeboard([prey, self], 'groupselectboard')
    expect(memorylistboardelementsbygroup(board, '', ['combat'])).toHaveLength(
      1,
    )
    const result = memoryevaldir(
      board,
      self,
      '',
      ['SELECT', 'inorder', ['combat']] as any,
      { x: 1, y: 1 },
    )
    expect(result.destpt).toEqual({ x: 5, y: 6 })
  })
})

describe('readtransformfilter GROUP', () => {
  it('parses plain group name as targetset', () => {
    const { targetset } = readtransformfilter(['combat'], 0)
    expect(targetset).toBe('combat')
  })

  it('parses color + group name', () => {
    READ_CONTEXT.words = []
    const { targetset } = readtransformfilter(['yellow', 'combat'], 0)
    expect(targetset).toBe('combat')
  })

  it('keeps builtin terrain', () => {
    const { targetset } = readtransformfilter(['terrain'], 0)
    expect(targetset).toBe('terrain')
  })
})
