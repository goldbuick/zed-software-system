import { join } from 'node:path'

import {
  checkfirmwarecatalogdocs,
  collectfirmwarecatalog,
  writefirmwarecatalogdocs,
} from 'ops/lib/firmwarecommandcatalog'

const ROOT = join(__dirname, '../../../..')

describe('firmwarecommandcatalog', () => {
  it('collects commands with descriptions and where flags', () => {
    const rows = collectfirmwarecatalog()
    expect(rows.length).toBeGreaterThan(50)
    const clear = rows.find((row) => row.name === 'clear')
    expect(clear).toBeDefined()
    expect(clear?.where.cli).toBe(true)
    expect(clear?.where.loader).toBe(true)
    expect(clear?.where.runtime).toBe(true)
    expect(clear?.description.length).toBeGreaterThan(0)
    expect(clear?.modulepath).toBe('/firmware/element')
    const bgplay = rows.find((row) => row.name === 'bgplay')
    expect(bgplay?.modulepath).toBe('/firmware/audio')
    const books = rows.find((row) => row.name === 'books')
    expect(books?.modulepath).toBe('/firmware/cli')
    const readline = rows.find((row) => row.name === 'readline')
    expect(readline?.modulepath).toBe('/firmware/loader')
  })

  it('firmware docs match runner catalog', () => {
    if (process.env.FIRMWARE_CATALOG_WRITE === '1') {
      writefirmwarecatalogdocs(ROOT)
    }
    expect(checkfirmwarecatalogdocs(ROOT)).toBe(true)
  })
})
