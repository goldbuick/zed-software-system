import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('loader media.ts', () => {
  it('registers loader-only #media <name> <url> via mediasubmiturl', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/firmware/loader/media.ts'),
      'utf8',
    )
    expect(src).toContain('usage: #media <name> <url>')
    expect(src).toContain('mediasubmiturl')
    expect(src).toContain('memoryreadoperator')
    expect(src).toContain("memorycanruncommand(player, 'media')")
    expect(src).toContain('displayname')
  })

  it('wires media command into LOADER_FIRMWARE', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/firmware/loader.ts'),
      'utf8',
    )
    expect(src).toContain("from './loader/media'")
    expect(src).toContain("'media'")
    expect(src).toContain('loadermedia')
  })
})
