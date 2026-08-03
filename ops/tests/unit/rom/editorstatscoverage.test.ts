import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  STATS_BOARD,
  STATS_BOOLEAN,
  STATS_CONFIG,
  STATS_HELPER,
  STATS_INTERACTION,
  STATS_SENDER,
} from 'zss/device/vm/state'
import { romread } from 'zss/rom'
import { romhintfrommarkdown } from 'zss/rom/romhint'
import { builtingstatnamesforcodepagetype } from 'zss/screens/tape/statcompletenames'
import { CODE_PAGE_TYPE_STAT_KEYWORDS } from 'zss/words/stats'

const REPO_ROOT = join(__dirname, '../../../..')
const STATS_DIR = join(REPO_ROOT, 'zss/rom/editor/stats')
const STATS_CATEGORY = join(REPO_ROOT, 'zss/rom/editor/stats.md')

function readstathintfile(name: string): string {
  return readFileSync(join(STATS_DIR, `${name}.md`), 'utf8')
}

function hinthastext(content: string): boolean {
  const hint = romhintfrommarkdown(content)
  return typeof hint === 'string' && hint.length > 0
}

describe('editor stats ROM coverage', () => {
  const types = [
    'board',
    'object',
    'terrain',
    'charset',
    'palette',
    'loader',
    undefined,
  ] as const

  it('has expected list shapes per codepage type', () => {
    expect(builtingstatnamesforcodepagetype('loader')).toEqual([
      'event',
      'format',
    ])
    const charset = builtingstatnamesforcodepagetype('charset')
    expect(charset[0]).toBe('char0')
    expect(charset[255]).toBe('char255')
    expect(charset).toHaveLength(256)
    expect(charset.includes('width')).toBe(false)

    const palette = builtingstatnamesforcodepagetype('palette')
    expect(palette[0]).toBe('color0')
    expect(palette[15]).toBe('color15')
    expect(palette).toHaveLength(16)
    expect(palette.includes('height')).toBe(false)

    expect(builtingstatnamesforcodepagetype(undefined)).toEqual([])
    expect(builtingstatnamesforcodepagetype('txt')).toEqual([])
  })

  it('has a parseable hint for every required built-in field (except kind)', () => {
    const missing: string[] = []
    for (let t = 0; t < types.length; ++t) {
      const names = builtingstatnamesforcodepagetype(types[t])
      for (let i = 0; i < names.length; ++i) {
        const name = names[i]
        if (name === 'kind') {
          continue
        }
        const colormatch = /^color(\d+)$/.exec(name)
        const charmatch = /^char(\d+)$/.exec(name)
        if (colormatch || charmatch) {
          const rom = romread(`editor:stats:${name}`)
          if (!rom || !hinthastext(rom)) {
            missing.push(`${types[t] ?? 'default'}:${name}`)
          }
          continue
        }
        const path = join(STATS_DIR, `${name}.md`)
        if (!existsSync(path) || !hinthastext(readFileSync(path, 'utf8'))) {
          missing.push(`${types[t] ?? 'default'}:${name}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('has type-prefix ROMs', () => {
    for (let i = 0; i < CODE_PAGE_TYPE_STAT_KEYWORDS.length; ++i) {
      const name = CODE_PAGE_TYPE_STAT_KEYWORDS[i]
      expect(hinthastext(readstathintfile(name))).toBe(true)
    }
  })

  it('has STATS_* word-list ROMs', () => {
    const all = [
      ...STATS_BOARD,
      ...STATS_HELPER,
      ...STATS_SENDER,
      ...STATS_INTERACTION,
      ...STATS_BOOLEAN,
      ...STATS_CONFIG,
    ]
    const missing: string[] = []
    for (let i = 0; i < all.length; ++i) {
      const name = all[i]
      const path = join(STATS_DIR, `${name}.md`)
      if (!existsSync(path) || !hinthastext(readFileSync(path, 'utf8'))) {
        missing.push(name)
      }
    }
    expect(missing).toEqual([])
  })

  it('has bare @ category stats.md', () => {
    expect(existsSync(STATS_CATEGORY)).toBe(true)
    expect(hinthastext(readFileSync(STATS_CATEGORY, 'utf8'))).toBe(true)
  })

  it('does not require type.md or kind.md', () => {
    const stems = readdirSync(STATS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
    expect(stems.includes('type')).toBe(false)
    expect(stems.includes('kind')).toBe(false)
  })

  it('resolves parametric colorN and charN via romread', () => {
    expect(romhintfrommarkdown(romread('editor:stats:color3') ?? '')).toBe(
      '$DKGRAYPalette RGB for color slot 3',
    )
    expect(romhintfrommarkdown(romread('editor:stats:char12') ?? '')).toBe(
      '$DKGRAYCharset glyph pixels for character 12',
    )
    expect(romread('editor:stats:color99')).toBeUndefined()
    expect(romread('editor:stats:char999')).toBeUndefined()
  })
})
