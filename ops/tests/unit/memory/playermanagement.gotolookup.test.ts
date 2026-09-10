import { memoryreadobjectatpt } from 'zss/memory/boardaccess'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import {
  memorycreatebook,
  memorywritebookflag,
  memorywritecodepage,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memorymoveplayertoboard } from 'zss/memory/playermanagement'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

describe('memorymoveplayertoboard occupancy', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('moves player between boards and updates occupancy by x/y', () => {
    const playerpage = memorycreatecodepage('@player\n', {})
    const boarda = memorycreatecodepage('@board src\n', {})
    const boardb = memorycreatecodepage('@board dest\n', {})
    const book = memorycreatebook([playerpage, boarda, boardb])
    memoryresetbooks([book])
    memorywritemainbook(book.id)

    const src = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boarda)!
    const dest = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardb)!
    src.id = boarda.id
    dest.id = boardb.id

    memoryensureboardready(src)
    memoryensureboardready(dest)

    const player = 'pid_testplayer01'
    const obj = memorycreateboardobjectfromkind(
      src,
      { x: 5, y: 5 },
      MEMORY_LABEL.PLAYER,
      player,
    )
    expect(obj?.id).toBe(player)
    memorywritebookflag(book, player, 'board', src.id)

    expect(memoryreadobjectatpt(src, { x: 5, y: 5 })?.id).toBe(player)

    const ok = memorymoveplayertoboard(book, player, dest.id, { x: 2, y: 3 })
    expect(ok).toBe(true)
    expect(src.objects[player]).toBeUndefined()
    expect(dest.objects[player]).toBeDefined()
    expect(memoryreadobjectatpt(src, { x: 5, y: 5 })).toBeUndefined()
    expect(memoryreadobjectatpt(dest, { x: 2, y: 3 })?.id).toBe(player)

    // second hop must still see CATEGORY.ISOBJECT (runtime preserved on unlink)
    const boardc = memorycreatecodepage('@board third\n', {})
    memorywritecodepage(book, boardc)
    const third = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardc)!
    third.id = boardc.id
    memoryensureboardready(third)

    const ok2 = memorymoveplayertoboard(book, player, third.id, { x: 1, y: 1 })
    expect(ok2).toBe(true)
    expect(dest.objects[player]).toBeUndefined()
    expect(third.objects[player]).toBeDefined()
    expect(memoryreadobjectatpt(third, { x: 1, y: 1 })?.id).toBe(player)
  })
})
