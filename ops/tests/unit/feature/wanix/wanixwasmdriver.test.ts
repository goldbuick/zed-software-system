import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { readwanixwasmdriver } from 'zss/feature/wanix/wanixwasmdriver'

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
  }>
}

describe('wanixwasmdriver', () => {
  const manifest = JSON.parse(
    readFileSync(MANIFEST_PATH, 'utf8'),
  ) as HelloManifest

  it.each(manifest.fixtures)(
    'detects $driver for $output',
    ({ output, driver }) => {
      const bytes = readFileSync(path.join(WANIX_PUBLIC, output))
      expect(readwanixwasmdriver(bytes)).toBe(driver)
    },
  )

  it('detects gojs findplayers', () => {
    const bytes = readFileSync(path.join(WANIX_PUBLIC, 'findplayers.wasm'))
    expect(readwanixwasmdriver(bytes)).toBe('gojs')
  })

  it('detects gojs zedcafe', () => {
    const bytes = readFileSync(path.join(WANIX_PUBLIC, 'zedcafe.wasm'))
    expect(readwanixwasmdriver(bytes)).toBe('gojs')
  })
})
