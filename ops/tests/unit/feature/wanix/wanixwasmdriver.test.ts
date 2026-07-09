import { readFileSync } from 'node:fs'
import path from 'node:path'

import { readwanixwasmdriver } from 'zss/feature/wanix/wanixwasmdriver'

const WANIX_PUBLIC = path.join(process.cwd(), 'ops/public/wanix')

describe('wanixwasmdriver', () => {
  it('detects wasi fixtures', () => {
    const bytes = readFileSync(path.join(WANIX_PUBLIC, 'hello.wasm'))
    expect(readwanixwasmdriver(bytes)).toBe('wasi')
  })

  it('detects gojs findplayers', () => {
    const bytes = readFileSync(path.join(WANIX_PUBLIC, 'findplayers.wasm'))
    expect(readwanixwasmdriver(bytes)).toBe('gojs')
  })

  it('detects gojs zedcafe', () => {
    const bytes = readFileSync(path.join(WANIX_PUBLIC, 'zedcafe.wasm'))
    expect(readwanixwasmdriver(bytes)).toBe('gojs')
  })
})
