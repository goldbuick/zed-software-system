import {
  readwanixbinddroparchivestem,
  readwanixbinddropbasename,
  readwanixbinddropdst,
  readwanixbinddropkind,
  readwanixbinddropperm,
} from 'zss/feature/wanix/wanixbindpaths'

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
    expect(readwanixbinddropperm('stamp.png')).toBe('0644')
  })

  it('strips archive extensions for mount stems', () => {
    expect(readwanixbinddroparchivestem('pack.tar.gz')).toBe('pack')
    expect(readwanixbinddroparchivestem('pack.tgz')).toBe('pack')
  })
})
