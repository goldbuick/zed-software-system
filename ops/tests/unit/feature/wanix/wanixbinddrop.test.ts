import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { WANIX_PUBLIC_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  readwanixbinddroparchivestem,
  readwanixbinddropbasename,
  readwanixbinddropdst,
  readwanixbinddropkind,
  readwanixbinddropperm,
} from 'zss/feature/wanix/wanixbindpaths'

const STAMP_NAMES = [
  'stamp-red.png',
  'stamp-green.png',
  'stamp-blue.png',
] as const

describe('wanixbinddrop', () => {
  it('routes all attached drops under input/', () => {
    expect(readwanixbinddropdst('level.png', 'file')).toBe('input/level.png')
    expect(readwanixbinddropdst('pack.tgz', 'archive')).toBe('input/pack')
  })

  it('reads basename from nested label paths', () => {
    expect(readwanixbinddropbasename('nested/level.png')).toBe('level.png')
  })

  it('classifies archives and executable perms', () => {
    expect(readwanixbinddropkind('pack.tar.gz')).toBe('archive')
    expect(readwanixbinddropkind('pack.tgz')).toBe('archive')
    expect(readwanixbinddropkind('run.wasm')).toBe('file')
    expect(readwanixbinddropperm('run.wasm')).toBe('0755')
    expect(readwanixbinddropperm('png2terrain.sh')).toBe('0755')
    expect(readwanixbinddropperm('stamp-red.png')).toBe('0644')
  })

  it('strips archive extensions for mount stems', () => {
    expect(readwanixbinddroparchivestem('pack.tar.gz')).toBe('pack')
    expect(readwanixbinddroparchivestem('pack.tgz')).toBe('pack')
  })

  it('ships bind-on-drop public fixtures with distinct stamp sizes', () => {
    const required = [
      'listinput.wasm',
      'input2terrain.wasm',
      'png2terrain.sh',
      ...STAMP_NAMES,
    ]
    for (let i = 0; i < required.length; ++i) {
      const file = path.join(WANIX_PUBLIC_FIXTURES_DIR, required[i])
      expect(existsSync(file)).toBe(true)
    }
    const lengths = STAMP_NAMES.map((name) =>
      statSync(path.join(WANIX_PUBLIC_FIXTURES_DIR, name)).size,
    )
    expect(lengths[0]).not.toBe(lengths[1])
    expect(lengths[0]).not.toBe(lengths[2])
    expect(lengths[1]).not.toBe(lengths[2])
    expect(lengths.every((n) => n > 70)).toBe(true)
    // PNG magic
    for (let i = 0; i < STAMP_NAMES.length; ++i) {
      const bytes = readFileSync(
        path.join(WANIX_PUBLIC_FIXTURES_DIR, STAMP_NAMES[i]),
      )
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    }
  })
})
