import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  catalogrowsformodule,
  checkfirmwarecatalogdocs,
  collectfirmwarecatalog,
  firmwarecatalogpaths,
  firmwaremodulepages,
  missingcategorycommands,
  parsecommandcategoryanchors,
  slugifyfirmwareheading,
  writefirmwarecatalogdocs,
} from 'ops/lib/firmwarecommandcatalog'

const ROOT = join(__dirname, '../../../..')
const CATALOG_END = '{/* firmware-catalog:end */}'

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

  it('parses command anchors from #### #cmd headings', () => {
    expect(slugifyfirmwareheading('#put')).toBe('put')
    expect(slugifyfirmwareheading('#synth1 … #synth4')).toBe('synth1-synth4')
    const sample = `
## Command Categories

### Text-to-Speech

#### #tts

Speak.

#### #ttsvol

Volume.

### Synthesis

#### #synth1 … #synth4

Per-voice synth.

#### #play

Play.

### Per-voice effects

#### #echo1, #echo2, #echo3

Echo.
`
    const anchors = parsecommandcategoryanchors(sample)
    expect(anchors.get('tts')).toBe('tts')
    expect(anchors.get('play')).toBe('play')
    expect(anchors.get('synth2')).toBe('synth1-synth4')
    expect(anchors.get('echo2')).toBe('echo1-echo2-echo3')
  })

  it('lists every module command in at least one #### heading', () => {
    const rows = collectfirmwarecatalog()
    const paths = firmwarecatalogpaths(ROOT)
    for (let i = 0; i < paths.modules.length; i++) {
      const mod = paths.modules[i]
      const text = readFileSync(mod.path, 'utf8')
      const end = text.indexOf(CATALOG_END)
      expect(end).toBeGreaterThanOrEqual(0)
      const hand = text.slice(end + CATALOG_END.length)
      const missing = missingcategorycommands(
        catalogrowsformodule(mod.firmwareid, rows),
        hand,
      )
      expect({ id: mod.id, missing }).toEqual({ id: mod.id, missing: [] })
    }
  })

  it('lists registered commands per module page', () => {
    const rows = collectfirmwarecatalog()
    const pages = firmwaremodulepages()
    expect(pages.length).toBe(8)
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const filtered = catalogrowsformodule(page.firmwareid, rows)
      expect(filtered.length).toBeGreaterThan(0)
    }
    const audio = catalogrowsformodule('audio', rows)
    expect(audio.some((row) => row.name === 'bgplay')).toBe(true)
    const runtime = catalogrowsformodule('runtime', rows)
    expect(runtime.some((row) => row.name === 'endgame')).toBe(true)
    expect(runtime.some((row) => row.name === 'help')).toBe(true)
  })

  it('firmware docs match runner catalog', () => {
    if (process.env.FIRMWARE_CATALOG_WRITE === '1') {
      writefirmwarecatalogdocs(ROOT)
    }
    expect(checkfirmwarecatalogdocs(ROOT)).toBe(true)
  })
})
