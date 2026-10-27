import { FORMAT_OBJECT } from 'zss/feature/format'
import {
  memoryreadcodepagedata,
  memorycreatecodepage,
  memoryexportcodepage,
} from 'zss/memory/codepageoperations'
import {
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

describe('codepage object and terrain code on save', () => {
  it('omits type-element code on save and keeps it on a plain export', () => {
    const objectcode = '@gem\n@char 4\n'
    const objectpage = memorycreatecodepage(objectcode, {})
    const objectel = memoryreadcodepagedata<CODE_PAGE_TYPE.OBJECT>(objectpage)
    expect(objectel?.code).toBe(objectcode)

    const terraincode = '@terrain water\n@char 176\n'
    const terrainpage = memorycreatecodepage(terraincode, {})
    const terrainel =
      memoryreadcodepagedata<CODE_PAGE_TYPE.TERRAIN>(terrainpage)
    expect(terrainel?.code).toBe(terraincode)

    const boardcode = '@board arena\n'
    const boardpage = memorycreatecodepage(boardcode, {})
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.objects.sid_actor = {
      id: 'sid_actor',
      x: 2,
      y: 3,
      code: '#die',
      kind: 'object',
    }

    const objectjson = memoryexportcodepage(objectpage, {
      format: 'json',
      omittypecode: true,
    }) as { code: string; object: { code?: string; char?: number } }
    expect(objectjson.code).toBe(objectcode)
    expect(objectjson.object.code).toBeUndefined()
    expect(objectjson.object.char).toBe(4)
    expect(objectel?.code).toBe(objectcode)

    const objectplain = memoryexportcodepage(objectpage, {
      format: 'json',
    }) as { object: { code?: string } }
    expect(objectplain.object.code).toBe(objectcode)

    const objectwire = memoryexportcodepage(objectpage, {
      omittypecode: true,
    }) as FORMAT_OBJECT
    expect(readwire(objectwire, CODE_PAGE_KEYS.code)).toBe(objectcode)
    expect(
      readwire(
        readwire(objectwire, CODE_PAGE_KEYS.object),
        BOARD_ELEMENT_KEYS.code,
      ),
    ).toBeUndefined()
    expect(
      readwire(
        readwire(objectwire, CODE_PAGE_KEYS.object),
        BOARD_ELEMENT_KEYS.char,
      ),
    ).toBe(4)

    const objectwireplain = memoryexportcodepage(objectpage) as FORMAT_OBJECT
    expect(
      readwire(
        readwire(objectwireplain, CODE_PAGE_KEYS.object),
        BOARD_ELEMENT_KEYS.code,
      ),
    ).toBe(objectcode)

    const terrainjson = memoryexportcodepage(terrainpage, {
      format: 'json',
      omittypecode: true,
    }) as { code: string; terrain: { code?: string; char?: number } }
    expect(terrainjson.code).toBe(terraincode)
    expect(terrainjson.terrain.code).toBeUndefined()
    expect(terrainjson.terrain.char).toBe(176)
    expect(terrainel?.code).toBe(terraincode)

    const terrainplain = memoryexportcodepage(terrainpage, {
      format: 'json',
    }) as { terrain: { code?: string } }
    expect(terrainplain.terrain.code).toBe(terraincode)

    const terrainwire = memoryexportcodepage(terrainpage, {
      omittypecode: true,
    }) as FORMAT_OBJECT
    expect(readwire(terrainwire, CODE_PAGE_KEYS.code)).toBe(terraincode)
    expect(
      readwire(
        readwire(terrainwire, CODE_PAGE_KEYS.terrain),
        BOARD_ELEMENT_KEYS.code,
      ),
    ).toBeUndefined()

    const terrainwireplain = memoryexportcodepage(terrainpage) as FORMAT_OBJECT
    expect(
      readwire(
        readwire(terrainwireplain, CODE_PAGE_KEYS.terrain),
        BOARD_ELEMENT_KEYS.code,
      ),
    ).toBe(terraincode)

    const boardjson = memoryexportcodepage(boardpage, {
      format: 'json',
      omittypecode: true,
    }) as {
      code: string
      board: { objects: Record<string, { code?: string }> }
    }
    expect(boardjson.code).toBe(boardcode)
    expect(boardjson.board.objects.sid_actor.code).toBe('#die')
  })
})
