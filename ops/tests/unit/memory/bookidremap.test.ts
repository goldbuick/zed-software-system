import { createsynthid, isfilenamesafeid } from 'zss/mapping/guid'
import { remapbookidsforfilenamesafety } from 'zss/memory/bookidremap'
import {
  memoryimportbookfromjson,
  memoryreadbookflags,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memoryreadcodepagedata } from 'zss/memory/codepageoperations'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

describe('remapbookidsforfilenamesafety', () => {
  it('rewrites dotted book, page, object, and derived flag ids', () => {
    const oldbook = 'sid_book.dot1'
    const oldpage = 'sid_.TitlePage'
    const oldobj = 'sid_obj.trailing.'
    const book = {
      id: oldbook,
      name: 'demo',
      token: 'tok',
      timestamp: 1,
      activelist: [],
      pages: [
        {
          id: oldpage,
          code: '@board title\n@exiteast room1\n',
          board: {
            id: oldpage,
            exitnorth: 'title',
            exiteast: oldbook,
            objects: {
              [oldobj]: {
                id: oldobj,
                kind: 'gem',
                x: 1,
                y: 2,
              },
            },
          },
        },
      ],
      flags: {
        [oldpage]: { hp: 1 },
        [createsynthid(oldpage)]: { voice: 0 },
      },
    }

    remapbookidsforfilenamesafety(book)

    expect(book.id).toBe('sid_book_dot1')
    expect(isfilenamesafeid(book.id)).toBe(true)
    expect(book.pages[0].id).toBe('sid__TitlePage')
    expect(book.pages[0].board.id).toBe('sid__TitlePage')
    expect(book.pages[0].board.exitnorth).toBe('title')
    expect(book.pages[0].board.exiteast).toBe('sid_book_dot1')
    const objects = book.pages[0].board.objects
    expect(Object.keys(objects)).toEqual(['sid_obj_trailing_'])
    expect(objects.sid_obj_trailing_.id).toBe('sid_obj_trailing_')
    expect(book.flags.sid__TitlePage).toEqual({ hp: 1 })
    expect(book.flags[createsynthid('sid__TitlePage')]).toEqual({ voice: 0 })
    expect(book.flags[oldpage]).toBeUndefined()
    expect(book.flags[createsynthid(oldpage)]).toBeUndefined()
  })

  it('is a no-op when all ids are already safe', () => {
    const book = {
      id: 'sid_safeBook',
      name: 'demo',
      pages: [{ id: 'sid_safePage', code: '@board title\n' }],
      flags: {},
    }
    remapbookidsforfilenamesafety(book)
    expect(book.id).toBe('sid_safeBook')
    expect(book.pages[0].id).toBe('sid_safePage')
  })
})

describe('memoryimportbookfromjson remaps dotted ids', () => {
  it('imports a book with dotted ids as filename-safe', () => {
    const imported = memoryimportbookfromjson({
      id: 'sid_import.book',
      name: 'importme',
      token: 't',
      timestamp: 0,
      activelist: [],
      pages: [
        {
          id: 'sid_board.one',
          code: '@board title\n@exitwest hub\n',
          board: {
            id: 'sid_board.one',
            exitwest: 'hub',
            terrain: [],
            objects: {
              'sid_gem.1': { id: 'sid_gem.1', kind: 'gem', x: 3, y: 4 },
            },
          },
        },
      ],
      flags: {},
    })

    expect(imported).toBeDefined()
    expect(imported?.id).toBe('sid_import_book')
    expect(imported?.pages[0]?.id).toBe('sid_board_one')
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(
      imported?.pages[0],
    )
    expect(board?.id).toBe('sid_board_one')
    expect(board?.exitwest).toBe('hub')
    expect(board?.objects.sid_gem_1?.id).toBe('sid_gem_1')
  })
})

describe('memoryimportbookfromjson flag bags', () => {
  it('rejects string flag values from corrupt headless persist', () => {
    const player = 'pid_corrupt_player'
    const imported = memoryimportbookfromjson({
      id: 'sid_flagbag_book',
      name: 'flagbag',
      token: 't',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {
        [player]: player,
        [`${player}_gadget`]: 'sid_not_a_bag',
      },
    })
    expect(imported).toBeDefined()
    const flags = memoryreadbookflags(imported, player)
    expect(typeof flags).toBe('object')
    expect(flags).not.toBe(player)
    memorywritebookflag(imported, player, 'enterx', 3)
    expect(flags.enterx).toBe(3)
  })
})
