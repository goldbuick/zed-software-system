import {
  memoryexportboardelement,
  memoryimportboardelement,
} from 'zss/memory/boardelement'
import { BOARD_ELEMENT, BOARD_ELEMENT_KEYS } from 'zss/memory/types'

describe('boardelement lx/ly removal', () => {
  it('keeps reserved wire enum slots at indices 4 and 5', () => {
    expect(BOARD_ELEMENT_KEYS.lx).toBe(4)
    expect(BOARD_ELEMENT_KEYS.ly).toBe(5)
    expect(BOARD_ELEMENT_KEYS.code).toBe(6)
  })

  it('omits lx/ly from JSON object export', () => {
    const element: BOARD_ELEMENT = {
      id: 'sid_test',
      kind: 'player',
      x: 3,
      y: 4,
    }
    const exported = memoryexportboardelement(element, { format: 'json' }) as
      | Record<string, unknown>
      | undefined
    expect(exported).toBeDefined()
    expect(exported).not.toHaveProperty('lx')
    expect(exported).not.toHaveProperty('ly')
    expect(exported?.x).toBe(3)
    expect(exported?.y).toBe(4)
  })

  it('strips lx/ly from JSON import payloads', () => {
    const imported = memoryimportboardelement(
      {
        id: 'sid_old',
        kind: 'player',
        x: 1,
        y: 2,
        lx: 9,
        ly: 8,
      },
      { format: 'json' },
    )
    expect(imported).toBeDefined()
    expect(imported).not.toHaveProperty('lx')
    expect(imported).not.toHaveProperty('ly')
    expect(imported?.x).toBe(1)
    expect(imported?.y).toBe(2)
  })

  it('strips lx/ly from wire import payloads', () => {
    const wire = [
      BOARD_ELEMENT_KEYS.id,
      'sid_wire',
      BOARD_ELEMENT_KEYS.x,
      5,
      BOARD_ELEMENT_KEYS.y,
      6,
      BOARD_ELEMENT_KEYS.lx,
      1,
      BOARD_ELEMENT_KEYS.ly,
      2,
    ]
    const imported = memoryimportboardelement(wire, { format: 'wire' })
    expect(imported).toBeDefined()
    expect(imported).not.toHaveProperty('lx')
    expect(imported).not.toHaveProperty('ly')
    expect(imported?.id).toBe('sid_wire')
    expect(imported?.x).toBe(5)
    expect(imported?.y).toBe(6)
  })

  it('skips lx/ly on object wire export', () => {
    const element = {
      id: 'sid_wire_out',
      x: 7,
      y: 8,
      lx: 1,
      ly: 2,
    } as BOARD_ELEMENT & { lx?: number; ly?: number }
    const exported = memoryexportboardelement(element, { format: 'wire' }) as
      | unknown[]
      | undefined
    expect(exported).toBeDefined()
    const keys = []
    for (let i = 0; i < (exported?.length ?? 0); i += 2) {
      keys.push(exported![i])
    }
    expect(keys).not.toContain(BOARD_ELEMENT_KEYS.lx)
    expect(keys).not.toContain(BOARD_ELEMENT_KEYS.ly)
  })
})
