import { loadcharsetfrombytes } from 'zss/feature/bytes'
import { memoryupdateboardvisuals } from 'zss/memory/boardvisuals'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { FILE_BYTES_PER_CHAR } from 'zss/gadget/data/types'
import { memoryresetbooks } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

function makecharsetpage(name: string, fill = 255) {
  const page = memorycreatecodepage(`@charset ${name}\n`, {})
  const data = memoryreadcodepagedata<CODE_PAGE_TYPE.CHARSET>(page)!
  const glyphs = new Uint8Array(256 * FILE_BYTES_PER_CHAR)
  glyphs.fill(fill)
  const bitmap = loadcharsetfrombytes(glyphs)!
  Object.assign(data, bitmap)
  return page
}

describe('memoryupdateboardvisuals world charset', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('uses book @charset world when board has no charset stat', () => {
    const world = makecharsetpage('world', 1)
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([world, boardpage])
    memoryresetbooks([book])
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    delete board.charset
    delete board.charsetpage
    memoryupdateboardvisuals(board)
    expect(board.charsetpage).toBe(world.id)
  })

  it('prefers board charset over book world', () => {
    const world = makecharsetpage('world', 1)
    const custom = makecharsetpage('fancy', 2)
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([world, custom, boardpage])
    memoryresetbooks([book])
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    board.charset = 'fancy'
    delete board.charsetpage
    memoryupdateboardvisuals(board)
    expect(board.charsetpage).toBe(custom.id)
  })

  it('clears charsetpage when neither board nor world charset exists', () => {
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([boardpage])
    memoryresetbooks([book])
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    board.charsetpage = 'stale'
    delete board.charset
    memoryupdateboardvisuals(board)
    expect(board.charsetpage).toBeUndefined()
  })
})
