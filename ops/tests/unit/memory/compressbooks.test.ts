import { compress } from '@bokuweb/zstd-wasm'
import JSZip from 'jszip'
import {
  FORMAT_OBJECT,
  formatobject,
  packformat,
} from 'zss/feature/format'
import { ensurezstdwasm } from 'zss/feature/zstdwasm'
import { creategadgetid, createsid } from 'zss/mapping/guid'
import { base64tobase64url } from 'zss/mapping/encode'
import { ispresent } from 'zss/mapping/types'
import { memorycreateboard } from 'zss/memory/boardlifecycle'
import {
  memorycreatebook,
  memoryexportbook,
  memoryreadbookflags,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreatecodepage,
  memoryexportcodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryexportshouldskipflagowner } from 'zss/memory/exportflagcache'
import { memoryresetbooks } from 'zss/memory/session'
import {
  memorycompressbooks,
  memorydecompressbooks,
} from 'zss/memory/utilities'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  BOOK_KEYS,
  CODE_PAGE_TYPE,
  FIXED_DATE,
} from 'zss/memory/types'

function readboard(book: BOOK, pagename: string): BOARD {
  const page = book.pages.find((p) => p.code.includes(`@board ${pagename}`))
  if (!page) {
    throw new Error(`missing board page ${pagename}`)
  }
  const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(page)
  if (!board) {
    throw new Error(`missing board runtime ${pagename}`)
  }
  return board
}

function makebookwithrefs(): {
  book: BOOK
  pageid: string
  objecta: string
  objectb: string
} {
  const board = memorycreateboard()
  const objecta = createsid()
  const objectb = createsid()
  board.objects[objecta] = {
    id: objecta,
    kind: 'widget',
    x: 1,
    y: 2,
    runtime: '',
  }
  board.objects[objectb] = {
    id: objectb,
    kind: 'widget',
    x: 3,
    y: 4,
    sender: objecta,
    p1: objecta,
    party: objecta,
    group: objecta,
    runtime: '',
  }

  const page = memorycreatecodepage('@board room\n', { board })
  board.b1 = page.id
  const book = memorycreatebook([page])
  return { book, pageid: page.id, objecta, objectb }
}

describe('memorycompressbooks', () => {
  afterEach(() => {
    memoryresetbooks([])
    memoryboundariesclear()
  })

  it('round-trips a book through zstd msgpack and reports size', async () => {
    const board = memorycreateboard()
    const oid = createsid()
    board.objects[oid] = {
      id: oid,
      kind: 'widget',
      x: 5,
      y: 6,
      runtime: '',
    }
    const book = memorycreatebook([
      memorycreatecodepage('@board title\n', { board }),
      memorycreatecodepage('@object widget\n@char 2\n', {
        object: { id: createsid(), char: 2, runtime: '' },
      }),
    ])
    memorywritebookflag(book, 'player1', 'score', 42 as any)

    const compressed = await memorycompressbooks([book])
    expect(compressed.startsWith('[')).toBe(false)
    expect(compressed.startsWith('UEs')).toBe(false)
    // eslint-disable-next-line no-console
    console.log(
      `memorycompressbooks size: ${compressed.length} base64url chars`,
    )

    memoryboundariesclear()
    const books = await memorydecompressbooks(compressed)
    expect(books.length).toBe(1)
    expect(books[0].name).toBe(book.name)
    expect(books[0].id).toBe(book.id)
    expect(memoryreadbookflags(books[0], 'player1')).toEqual({ score: 42 })
    const restored = readboard(books[0], 'title')
    const objs = Object.values(restored.objects)
    expect(objs.length).toBe(1)
    expect(objs[0].kind).toBe('widget')
    expect(objs[0].x).toBe(5)
    expect(objs[0].y).toBe(6)
  })

  it('drops _gadget and _layers caches but keeps durable flags', async () => {
    expect(memoryexportshouldskipflagowner('x_gadget')).toBe(true)
    expect(memoryexportshouldskipflagowner('y_layers')).toBe(true)
    expect(memoryexportshouldskipflagowner('gadgetstore')).toBe(true)
    expect(memoryexportshouldskipflagowner('pid_abc')).toBe(false)

    const book = memorycreatebook([
      memorycreatecodepage('@board room\n', { board: memorycreateboard() }),
    ])
    const durable = 'pid_player_one'
    memorywritebookflag(book, durable, 'health', 100 as any)
    memorywritebookflag(book, creategadgetid(durable), 'state', {
      layers: [{ type: 1 }],
    } as any)
    memorywritebookflag(book, `${book.pages[0].id}_layers`, 'normal', {
      id: 'cache',
    } as any)
    memorywritebookflag(book, 'gadgetstore', 'legacy', { layers: [] } as any)

    const compressed = await memorycompressbooks([book])
    memoryboundariesclear()
    const [again] = await memorydecompressbooks(compressed)
    expect(memoryreadbookflags(again, durable)).toEqual({ health: 100 })
    expect(again.flags[creategadgetid(durable)]).toBeUndefined()
    expect(again.flags[`${book.pages[0].id}_layers`]).toBeUndefined()
    expect(again.flags.gadgetstore).toBeUndefined()
  })

  it('drops ephemeral chip bags but keeps live object chips', async () => {
    expect(memoryexportshouldskipflagowner('pid_x_cli_chip')).toBe(true)
    expect(memoryexportshouldskipflagowner('sid_x_draw_chip')).toBe(true)
    expect(memoryexportshouldskipflagowner('widget_run_chip')).toBe(true)
    expect(memoryexportshouldskipflagowner('sid_x_loader_chip')).toBe(true)
    expect(memoryexportshouldskipflagowner('draw_2_sid_x_chip')).toBe(true)
    expect(memoryexportshouldskipflagowner('sid_abc_chip')).toBe(false)
    expect(memoryexportshouldskipflagowner('pid_0001_player_chip')).toBe(false)

    const board = memorycreateboard()
    const oid = createsid()
    board.objects[oid] = {
      id: oid,
      kind: 'widget',
      x: 1,
      y: 1,
      runtime: '',
    }
    const book = memorycreatebook([
      memorycreatecodepage('@board room\n', { board }),
    ])
    const durablechip = `${oid}_chip`
    memorywritebookflag(book, durablechip, 'ec', 3 as any)
    memorywritebookflag(book, 'pid_player_cli_chip', 'lb', [] as any)
    memorywritebookflag(book, `${oid}_draw_chip`, 'ec', 1 as any)
    memorywritebookflag(book, 'widget_run_chip', 'ec', 1 as any)
    memorywritebookflag(book, 'sid_tmp_loader_chip', 'ec', 1 as any)
    memorywritebookflag(book, `draw_2_${oid}_chip`, 'ec', 1 as any)

    const compressed = await memorycompressbooks([book])
    memoryboundariesclear()
    const [again] = await memorydecompressbooks(compressed)
    expect(memoryreadbookflags(again, durablechip)).toEqual({ ec: 3 })
    expect(again.flags.pid_player_cli_chip).toBeUndefined()
    expect(again.flags[`${oid}_draw_chip`]).toBeUndefined()
    expect(again.flags.widget_run_chip).toBeUndefined()
    expect(again.flags.sid_tmp_loader_chip).toBeUndefined()
    expect(again.flags[`draw_2_${oid}_chip`]).toBeUndefined()
  })

  it('preserves sids referenced from board and element stats', async () => {
    const { book, pageid, objecta } = makebookwithrefs()

    const compressed = await memorycompressbooks([book])
    memoryboundariesclear()
    const [again] = await memorydecompressbooks(compressed)
    const board = readboard(again, 'room')

    // page id is referenced from board.b1, so it must survive unchanged
    expect(board.b1).toBe(pageid)
    expect(again.pages[0].id).toBe(pageid)
    // objecta is referenced from element stats, so its sid is unchanged
    expect(board.objects[objecta]).toBeDefined()
    // the other object may be reminted; find by stats that still point at objecta
    const others = Object.values(board.objects).filter((o) => o.id !== objecta)
    expect(others.length).toBe(1)
    const b = others[0] as BOARD_ELEMENT
    expect(b.sender).toBe(objecta)
    expect(b.p1).toBe(objecta)
    expect(b.party).toBe(objecta)
    expect(b.group).toBe(objecta)
  })

  it('does not rewrite ids that appear more than once outside structural aliases', () => {
    const { book, pageid, objecta } = makebookwithrefs()
    const exported = memoryexportbook(book)
    expect(ispresent(exported)).toBe(true)
    const blob = JSON.stringify(exported)
    // referenced ids stay as original sid strings in the wire payload
    expect(blob.includes(pageid)).toBe(true)
    expect(blob.includes(objecta)).toBe(true)
  })

  it('loads a legacy JSZip envelope payload', async () => {
    await ensurezstdwasm()
    const board = memorycreateboard()
    const book = memorycreatebook([
      memorycreatecodepage('@board legacy\n', { board }),
    ])
    // Build pre-remap wire (string ids only) and wrap in the old zip container.
    const pagesout = book.pages.map((codepage) =>
      memoryexportcodepage(codepage, true),
    )
    const wire = formatobject(
      { ...book, pages: pagesout },
      BOOK_KEYS,
      {
        flags: () => ({}),
      },
    ) as FORMAT_OBJECT
    const bin = packformat(wire)
    expect(ispresent(bin)).toBe(true)
    const squash = compress(bin!, 15)
    const zip = new JSZip()
    zip.file(book.id, squash, { date: FIXED_DATE })
    const legacy = base64tobase64url(
      await zip.generateAsync({ type: 'base64' }),
    )
    expect(legacy.startsWith('UEs')).toBe(true)

    memoryboundariesclear()
    const books = await memorydecompressbooks(legacy)
    expect(books.length).toBe(1)
    expect(books[0].id).toBe(book.id)
    expect(readboard(books[0], 'legacy')).toBeDefined()
  })
})
