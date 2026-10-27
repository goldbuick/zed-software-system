import { FORMAT_OBJECT, formatobject } from 'zss/feature/format'
import { memoryexportboardelement } from 'zss/memory/boardelement'
import {
  memoryreadelementkind,
  memoryreadelementkindcode,
} from 'zss/memory/boards'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryexportcodepage,
  memoryimportcodepage,
  memoryreadcodepagedata,
  memoryresetcodepagestats,
} from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import {
  BOARD_ELEMENT,
  BOARD_ELEMENT_KEYS,
  CODE_PAGE_KEYS,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'

function readwire(entry: unknown, key: number): unknown {
  if (!Array.isArray(entry)) {
    return undefined
  }
  for (let i = 0; i < entry.length; i += 2) {
    if (entry[i] === key) {
      return entry[i + 1]
    }
  }
  return undefined
}

describe('object and terrain page code storage', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('exports page code once for an object page', () => {
    const code = '@gem\n@char 4\n'
    const page = memorycreatecodepage(code, {})
    const element = memoryreadcodepagedata<CODE_PAGE_TYPE.OBJECT>(page)
    expect(element?.code).toBeUndefined()
    expect(element?.char).toBe(4)
    element!.code = code

    const json = memoryexportcodepage(page, { format: 'json' }) as {
      code: string
      object: { code?: string; char?: number }
    }
    expect(json.code).toBe(code)
    expect(json.object.code).toBeUndefined()
    expect(json.object.char).toBe(4)

    const wire = memoryexportcodepage(page) as FORMAT_OBJECT
    expect(readwire(wire, CODE_PAGE_KEYS.code)).toBe(code)
    const objectwire = readwire(wire, CODE_PAGE_KEYS.object)
    expect(readwire(objectwire, BOARD_ELEMENT_KEYS.code)).toBeUndefined()
    expect(readwire(objectwire, BOARD_ELEMENT_KEYS.char)).toBe(4)
  })

  it('exports page code once for a terrain page', () => {
    const code = '@terrain water\n@char 176\n'
    const page = memorycreatecodepage(code, {})
    const element = memoryreadcodepagedata<CODE_PAGE_TYPE.TERRAIN>(page)
    expect(element?.code).toBeUndefined()
    expect(element?.char).toBe(176)
    element!.code = code

    const json = memoryexportcodepage(page, { format: 'json' }) as {
      code: string
      terrain: { code?: string; char?: number }
    }
    expect(json.code).toBe(code)
    expect(json.terrain.code).toBeUndefined()
    expect(json.terrain.char).toBe(176)

    const wire = memoryexportcodepage(page) as FORMAT_OBJECT
    expect(readwire(wire, CODE_PAGE_KEYS.code)).toBe(code)
    const terrainwire = readwire(wire, CODE_PAGE_KEYS.terrain)
    expect(readwire(terrainwire, BOARD_ELEMENT_KEYS.code)).toBeUndefined()
    expect(readwire(terrainwire, BOARD_ELEMENT_KEYS.char)).toBe(176)
  })

  it('keeps instance code on a board object', () => {
    const code = '@board arena\n'
    const page = memorycreatecodepage(code, {})
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(page)!
    board.objects.sid_actor = {
      id: 'sid_actor',
      x: 2,
      y: 3,
      code: '#die',
      kind: 'object',
    }
    const json = memoryexportcodepage(page, { format: 'json' }) as {
      code: string
      board: { objects: Record<string, { code?: string }> }
    }
    expect(json.code).toBe(code)
    expect(json.board.objects.sid_actor.code).toBe('#die')
  })

  it('drops legacy code on imported object and terrain elements', () => {
    const code = '@gem\n@char 4\n'
    const json = memoryimportcodepage(
      {
        id: 'sid_legacy',
        code,
        object: { id: 'sid_legacy', code, name: 'gem', char: 4 },
        terrain: { id: 'sid_legacy', code, name: 'water', char: 176 },
      },
      { format: 'json' },
    )
    expect(json?.code).toBe(code)
    expect(json?.object?.code).toBeUndefined()
    expect(json?.object?.char).toBe(4)
    expect(json?.terrain?.code).toBeUndefined()
    expect(json?.board?.objects).toBeUndefined()

    const elementwire = memoryexportboardelement({
      id: 'sid_wire',
      code,
      name: 'gem',
      char: 4,
    })
    const wire = formatobject(
      { id: 'sid_wire', code, object: elementwire },
      CODE_PAGE_KEYS,
    )
    const imported = memoryimportcodepage(wire)
    expect(imported?.code).toBe(code)
    expect(imported?.object?.code).toBeUndefined()
    expect(imported?.object?.char).toBe(4)
  })

  it('rebuilds kind stats and reads kind code from the page', () => {
    const page = memorycreatecodepage('@gem\n@char 4\n', {})
    memoryresetbooks([memorycreatebook([page])])
    const element: BOARD_ELEMENT = { id: 'sid_e', x: 0, y: 0, kind: 'gem' }

    expect(memoryreadelementkindcode(element)).toBe(page.code)
    expect(memoryreadelementkind(element)?.char).toBe(4)
    expect(memoryreadelementkind(element)?.code).toBeUndefined()

    page.code = '@gem\n@char 9\n'
    memoryresetcodepagestats(page)

    expect(memoryreadelementkind(element)?.char).toBe(9)
    expect(memoryreadelementkind(element)?.code).toBeUndefined()
    expect(memoryreadelementkindcode(element)).toBe(page.code)
  })
})
