import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const WANIX_PUBLIC = path.join(process.cwd(), 'ops/public/wanix')
const MANIFEST_PATH = path.join(
  process.cwd(),
  'ops/fixtures/wanix/hello/manifest.json',
)

type HelloManifest = {
  fixtures: Array<{
    lang: string
    output: string
    driver: string
    toolchain: string
    required: boolean
  }>
}

describe('wanixhellofixtures', () => {
  const manifest = JSON.parse(
    readFileSync(MANIFEST_PATH, 'utf8'),
  ) as HelloManifest

  it('manifest lists seven hello langs', () => {
    expect(manifest.fixtures).toHaveLength(7)
    expect(manifest.fixtures.map((row) => row.lang)).toEqual([
      'wat',
      'rust',
      'zig',
      'gowasi',
      'tinygo',
      'c',
      'gojs',
    ])
  })

  it.each(manifest.fixtures)(
    'committed $output exists and is non-empty',
    ({ output }) => {
      const filepath = path.join(WANIX_PUBLIC, output)
      const stat = statSync(filepath)
      expect(stat.size).toBeGreaterThan(0)
    },
  )

  it('hello-all.tgz bundles every hello wasm', () => {
    const names = manifest.fixtures.map((row) => row.output)
    for (const name of names) {
      expect(statSync(path.join(WANIX_PUBLIC, name)).size).toBeGreaterThan(0)
    }
    expect(statSync(path.join(WANIX_PUBLIC, 'hello-all.tgz')).size).toBeGreaterThan(
      0,
    )
  })
})
