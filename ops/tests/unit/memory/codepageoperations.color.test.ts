import {
  memoryapplyelementstats,
  memoryreadcodepagestatsfromtext,
} from 'zss/memory/codepageoperations'
import type { BOARD_ELEMENT } from 'zss/memory/types'
import { COLOR } from 'zss/words/types'

function applycode(code: string): BOARD_ELEMENT {
  const stats = memoryreadcodepagestatsfromtext(code)
  const element: BOARD_ELEMENT = {}
  memoryapplyelementstats(stats, element)
  return element
}

describe('memoryapplyelementstats color headers', () => {
  it('applies @color red onblue as fg red and bg blue', () => {
    const element = applycode(
      ['@object gem', '@color red onblue', ''].join('\n'),
    )
    expect(element.color).toBe(COLOR.RED)
    expect(element.bg).toBe(COLOR.BLUE)
  })

  it('applies @color red alone as fg only', () => {
    const element = applycode(['@object gem', '@color red', ''].join('\n'))
    expect(element.color).toBe(COLOR.RED)
    expect(element.bg).toBeUndefined()
  })

  it('applies @color onblue alone as bg only', () => {
    const element = applycode(['@object gem', '@color onblue', ''].join('\n'))
    expect(element.color).toBeUndefined()
    expect(element.bg).toBe(COLOR.BLUE)
  })

  it('still applies @color white + @bg blue', () => {
    const element = applycode(
      ['@object player', '@color white', '@bg blue', ''].join('\n'),
    )
    expect(element.color).toBe(COLOR.WHITE)
    expect(element.bg).toBe(COLOR.BLUE)
  })

  it('applies @displaycolor red onblue to displaycolor and displaybg', () => {
    const element = applycode(
      ['@object gem', '@displaycolor red onblue', ''].join('\n'),
    )
    expect(element.displaycolor).toBe(COLOR.RED)
    expect(element.displaybg).toBe(COLOR.BLUE)
    expect(element.color).toBeUndefined()
    expect(element.bg).toBeUndefined()
  })
})
