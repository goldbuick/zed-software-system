import { readFileSync } from 'fs'
import { join } from 'path'
import {
  charsetimportattachworldtobook,
  charsetimportclearpendingworld,
  parsefontcom,
} from 'zss/feature/parse/chr'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagename,
  memoryreadcodepagetype,
} from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

jest.mock('zss/device/api', () => ({
  apitoast: jest.fn(),
}))

const FIXTURE = join(
  __dirname,
  '../../../../fixtures/parse/fontmania-minimal.com',
)

describe('parsefontcom world charset', () => {
  afterEach(() => {
    memoryresetbooks([])
    charsetimportclearpendingworld()
  })

  it('writes @charset world into first content book', () => {
    const main = memorycreatebook([])
    main.name = 'main'
    const content = memorycreatebook([
      memorycreatecodepage('@board arena\n', {}),
    ])
    content.name = 'poke'
    memoryresetbooks([main, content], main.id)
    const bytes = new Uint8Array(readFileSync(FIXTURE))
    parsefontcom('player', 'Pokemon.com', bytes)
    const world = content.pages.find(
      (p) => memoryreadcodepagename(p) === 'world',
    )
    expect(world).toBeDefined()
    expect(memoryreadcodepagetype(world!)).toBe(CODE_PAGE_TYPE.CHARSET)
    expect(main.pages.some((p) => memoryreadcodepagename(p) === 'world')).toBe(
      false,
    )
  })

  it('stages glyphs when no book yet, then attachworld applies', () => {
    memoryresetbooks([])
    const bytes = new Uint8Array(readFileSync(FIXTURE))
    parsefontcom('player', 'Pokemon.com', bytes)
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([boardpage])
    book.name = 'late'
    charsetimportattachworldtobook('player', book)
    expect(
      book.pages.some((p) => memoryreadcodepagename(p) === 'world'),
    ).toBe(true)
  })
})
