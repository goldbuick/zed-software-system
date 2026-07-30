import { memoryfsapplyops } from 'zss/feature/memoryfs/apply'
import { buildmemoryfsexportfiles } from 'zss/feature/memoryfs/export'
import { memoryfsshouldmirrorflagowner } from 'zss/feature/memoryfs/flagfilter'
import { memoryfsisreadonlypath } from 'zss/feature/memoryfs/readonly'
import {
  isallowedmemoryfspath,
  kebabcasememoryfsdirname,
  validatememoryfsexportpaths,
} from 'zss/feature/memoryfs/schema'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreatebook,
  memoryexportbookasjson,
  memoryreadbookflags,
  memorywritebookflag,
  memorywritecodepage,
  memoryupsertcodepage,
} from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import {
  memoryresetbooks,
  memorywritebook,
  memorywritesoftwarebook,
} from 'zss/memory/session'

afterEach(() => {
  memoryboundariesclear()
  memoryresetbooks([])
})

function makebookwithpage() {
  const book = memorycreatebook([])
  book.name = 'testbook'
  book.id = 'sid_testbook01'
  const page = memorycreatecodepage('@board title\n', {})
  page.id = 'sid_titlepage1'
  memorywritecodepage(book, page)
  memoryupsertcodepage(book, {
    id: page.id,
    code: '@board title\n',
    board: {
      terrain: [],
      objects: {
        npc1: { id: 'npc1', x: 1, y: 2, name: 'npc' },
        pid_12_abcdefghijklmnop: {
          id: 'pid_12_abcdefghijklmnop',
          x: 3,
          y: 4,
          name: 'player',
        },
      },
      isdark: 0,
    },
  })
  memorywritebookflag(book, 'contentowner', 'score', 10)
  memorywritebookflag(book, 'sid_titlepage1_chip', 'cycle', 1)
  memorywritebookflag(book, 'sid_titlepage1_tracking', 'ids', ['a'])
  memorywritebook(book)
  memorywritesoftwarebook('main', book.id)
  memoryresetbooks([book])
  return book
}

describe('memoryfs schema', () => {
  it('kebabcases dirname', () => {
    expect(kebabcasememoryfsdirname('My Book', 'sid_abc')).toBe(
      'my-book-sid_abc',
    )
  })

  it('rejects parent paths', () => {
    expect(isallowedmemoryfspath('../stats.json')).toBe(false)
    expect(isallowedmemoryfspath('stats.json')).toBe(true)
    expect(
      isallowedmemoryfspath(
        'books/my-book-sid_x/flags/owner1/stats.json',
      ),
    ).toBe(true)
  })

  it('marks player object paths read-only', () => {
    expect(
      memoryfsisreadonlypath(
        'books/b/pages/p/board/objects/pid_12_abcdefghijklmnop.json',
      ),
    ).toBe(true)
    expect(
      memoryfsisreadonlypath('books/b/pages/p/board/objects/npc1.json'),
    ).toBe(false)
  })

  it('filters runtime flag owners', () => {
    expect(memoryfsshouldmirrorflagowner('contentowner')).toBe(true)
    expect(memoryfsshouldmirrorflagowner('x_chip')).toBe(false)
    expect(memoryfsshouldmirrorflagowner('x_tracking')).toBe(false)
    expect(memoryfsshouldmirrorflagowner('x_layers')).toBe(false)
    expect(memoryfsshouldmirrorflagowner('x_synth')).toBe(false)
    expect(memoryfsshouldmirrorflagowner('x_gadget')).toBe(false)
  })
})

describe('memoryfs export import', () => {
  it('builds allowlisted tree without timestamp or excluded flags', () => {
    makebookwithpage()
    const files = buildmemoryfsexportfiles()
    const check = validatememoryfsexportpaths(files)
    expect(check.ok).toBe(true)
    const paths = files.map((f) => f.path)
    expect(paths).toContain('stats.json')
    expect(paths.some((p) => p.includes('/flags/contentowner/'))).toBe(true)
    expect(paths.some((p) => p.includes('_chip'))).toBe(false)
    expect(paths.some((p) => p.includes('_tracking'))).toBe(false)
    const bookstats = files.find((f) => f.path.endsWith('/stats.json') && f.path.startsWith('books/') && !f.path.includes('/pages/') && !f.path.includes('/flags/'))
    expect(bookstats).toBeDefined()
    const meta = JSON.parse(new TextDecoder().decode(bookstats!.bytes))
    expect(meta.timestamp).toBeUndefined()
    expect(meta.flags).toBeUndefined()
  })

  it('round-trips book content ignoring timestamp', () => {
    const book = makebookwithpage()
    const before = memoryexportbookasjson(book)
    const files = buildmemoryfsexportfiles()
    const flagpath = files.find((f) =>
      f.path.includes('/flags/contentowner/stats.json'),
    )
    expect(flagpath).toBeDefined()
    // mutate mirrored flag via apply
    const result = memoryfsapplyops(
      [
        {
          path: flagpath!.path,
          bytes: new TextEncoder().encode(
            JSON.stringify({ score: 99 }, null, 2),
          ),
        },
      ],
      [],
    )
    expect(result.errors).toEqual([])
    expect(memoryreadbookflags(book, 'contentowner').score).toBe(99)
    const after = memoryexportbookasjson(book)
    expect(after.id).toBe(before.id)
    expect(after.name).toBe(before.name)
  })

  it('ignores inbound delete of player object path', () => {
    makebookwithpage()
    const files = buildmemoryfsexportfiles()
    const playerpath = files.find((f) =>
      f.path.includes('pid_12_abcdefghijklmnop.json'),
    )
    expect(playerpath).toBeDefined()
    const result = memoryfsapplyops([], [playerpath!.path])
    expect(result.ignored).toBeGreaterThan(0)
  })
})
