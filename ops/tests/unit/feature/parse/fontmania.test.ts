import { readFileSync } from 'fs'
import { join } from 'path'
import {
  extractfontmaniaglyphs,
  isfontmaniacom,
  resolvecharsetbytes,
} from 'zss/feature/parse/fontmania'
import { FILE_BYTES_PER_CHAR } from 'zss/gadget/data/types'
import { mapmimetype } from 'zss/feature/parse/file'

const FIXTURE = join(
  __dirname,
  '../../../../fixtures/parse/fontmania-minimal.com',
)

describe('fontmania', () => {
  const bytes = new Uint8Array(readFileSync(FIXTURE))

  it('detects Font Mania COM', () => {
    expect(isfontmaniacom(bytes)).toBe(true)
    expect(isfontmaniacom(new Uint8Array([1, 2, 3]))).toBe(false)
  })

  it('extracts 256 x 14 glyph bytes', () => {
    const glyphs = extractfontmaniaglyphs(bytes)
    expect(glyphs).toBeDefined()
    expect(glyphs!.length).toBe(256 * FILE_BYTES_PER_CHAR)
    // char 65 seeded in fixture
    const a = glyphs!.subarray(65 * 14, 66 * 14)
    expect(a[1]).toBe(0x10)
    expect(a[2]).toBe(0x38)
  })

  it('resolvecharsetbytes prefers Font Mania extract', () => {
    const glyphs = resolvecharsetbytes(bytes)
    expect(glyphs?.length).toBe(256 * FILE_BYTES_PER_CHAR)
  })

  it('resolvecharsetbytes accepts raw multiples of 14', () => {
    const raw = new Uint8Array(FILE_BYTES_PER_CHAR * 2)
    expect(resolvecharsetbytes(raw)?.length).toBe(raw.length)
  })
})

describe('mapmimetype fontcom', () => {
  it('maps .com under octet-stream', () => {
    const file = { name: 'Pokemon.com' } as File
    expect(mapmimetype('application/octet-stream', file)).toBe('fontcom')
  })

  it('maps .com by filename fallback', () => {
    const file = { name: 'Pokemon.com' } as File
    expect(mapmimetype('application/x-msdownload', file)).toBe('fontcom')
  })
})
