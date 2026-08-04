import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryreadelementkind } from 'zss/memory/boards'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryresetcodepagestats,
} from 'zss/memory/codepageoperations'
import { memoryensureboardelementruntime } from 'zss/memory/runtimeboundary'
import { memoryresetbooks } from 'zss/memory/session'
import { CATEGORY } from 'zss/words/types'

describe('memoryreadelementkind kinddata refresh', () => {
  afterEach(() => {
    memoryboundariesclear()
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
    memoryensureboardelementruntime(object!).category = CATEGORY.ISOBJECT

    const stub = memoryreadelementkind(object)
    expect(stub?.code).toBe('@widget\n')

    page.code = ['@widget', '@char 42', '@color 3', ''].join('\n')
    memoryresetcodepagestats(page)

    const refreshed = memoryreadelementkind(object)
    expect(refreshed?.code).toContain('@char 42')
    expect(refreshed?.char).toBe(42)
    expect(refreshed?.color).toBe(3)
  })
})
