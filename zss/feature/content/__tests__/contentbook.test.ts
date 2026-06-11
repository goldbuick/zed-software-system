import path from 'node:path'

import {
  buildbookfrommanifest,
  buildborderterrain,
  codepagefromjson,
  parsecodepagefilename,
  validatebookexport,
  validatecodepagefile,
} from 'zss/feature/content/contentbook'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memoryreadcodepagename,
  memoryreadcodepagetype,
} from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

const ROOT = process.cwd()
const MINIMAL_MANIFEST = path.join(
  ROOT,
  'content/templates/minimal/manifest.json',
)
const MINIMAL_PAGES = path.join(ROOT, 'content/templates/minimal/pages')
const DEMO_MANIFEST = path.join(ROOT, 'content/templates/demo/manifest.json')

afterEach(() => {
  memoryboundariesclear()
  memoryresetbooks([])
})

describe('contentbook', () => {
  it('parses codepage filenames', () => {
    expect(parsecodepagefilename('pages/player.object.json')).toEqual({
      name: 'player',
      type: 'object',
    })
    expect(parsecodepagefilename('bad.json')).toBeUndefined()
  })

  it('imports object page json from code', () => {
    const cp = codepagefromjson({
      code: '@terrain solid\n@issolid\n@char 219',
    })
    expect(memoryreadcodepagetype(cp)).toBe(CODE_PAGE_TYPE.TERRAIN)
    expect(memoryreadcodepagename(cp)).toBe('solid')
  })

  it('validates minimal template pages', () => {
    const files = [
      'player.object.json',
      'solid.terrain.json',
      'title.board.json',
    ]
    for (let i = 0; i < files.length; ++i) {
      const errors = validatecodepagefile(path.join(MINIMAL_PAGES, files[i]))
      expect(errors).toEqual([])
    }
  })

  it('builds and validates minimal book export', () => {
    const exportbook = buildbookfrommanifest(MINIMAL_MANIFEST)
    expect(exportbook.exported).toBe('minimal.book.json')
    expect(exportbook.data.pages?.length).toBe(3)
    const errors = validatebookexport(exportbook)
    expect(errors).toEqual([])
  })

  it('builds demo book with bordered title board', () => {
    const exportbook = buildbookfrommanifest(DEMO_MANIFEST)
    expect(exportbook.data.pages?.length).toBe(4)
    const errors = validatebookexport(exportbook)
    expect(errors).toEqual([])
    const titlepage = exportbook.data.pages?.find(
      (page: { code?: string }) => page.code?.startsWith('@board title'),
    )
    expect(titlepage?.board?.terrain?.length).toBe(buildborderterrain('solid').length)
  })
})
