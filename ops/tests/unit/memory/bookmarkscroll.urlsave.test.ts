jest.mock('zss/gadget/data/scrollwritelines', () => ({
  scrollwritelines: jest.fn(),
}))

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
}))

import { BOOKMARK_NAME_TARGET } from 'zss/feature/bookmarks'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorybookmarkscroll,
  memorymainbookisempty,
} from 'zss/memory/bookmarkscroll'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import {
  memoryreadbookbysoftware,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

describe('memorybookmarkscroll url save gating', () => {
  beforeEach(() => {
    jest.mocked(scrollwritelines).mockClear()
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('memorymainbookisempty is true with no MAIN or zero pages', () => {
    expect(memorymainbookisempty()).toBe(true)
    const empty = memorycreatebook([])
    memoryresetbooks([empty])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, empty.id)
    expect(memorymainbookisempty()).toBe(true)
  })

  it('omits name and save links when MAIN has no pages', () => {
    const empty = memorycreatebook([])
    memoryresetbooks([empty])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, empty.id)
    expect(memoryreadbookbysoftware(MEMORY_LABEL.MAIN)?.pages).toHaveLength(0)

    memorybookmarkscroll(
      'p1',
      [
        {
          kind: 'url',
          id: 'u1',
          name: 'home',
          href: 'https://zed.cafe/',
          createdat: 1,
        },
      ],
      [],
    )

    const content = jest.mocked(scrollwritelines).mock.calls[0]?.[2] as string
    expect(content).toContain('bookmarkurl')
    expect(content).toContain('bookmarkdel')
    expect(content).not.toContain('bookmarksave ')
    expect(content).not.toContain('bookmarksaveover')
    expect(content).not.toContain(`${BOOKMARK_NAME_TARGET} text`)
  })

  it('includes name and save links when MAIN has pages', () => {
    const page = memorycreatecodepage('@board room\n', {})
    const book = memorycreatebook([page])
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, book.id)
    expect(memorymainbookisempty()).toBe(false)

    memorybookmarkscroll('p1', [], [])

    const content = jest.mocked(scrollwritelines).mock.calls[0]?.[2] as string
    expect(content).toContain('bookmarksave')
    expect(content).toContain(`${BOOKMARK_NAME_TARGET} text`)
  })
})
