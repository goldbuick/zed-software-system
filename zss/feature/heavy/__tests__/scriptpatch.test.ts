import { patchcodepagescript } from 'zss/feature/heavy/scriptpatch'

describe('patchcodepagescript', () => {
  it('append adds snippet after existing code', () => {
    const out = patchcodepagescript(':a\n#idle\n', ':b\n#think\n', 'append')
    expect(out).toContain(':a')
    expect(out).toContain(':b')
  })

  it('replace_all replaces entire codepage', () => {
    const out = patchcodepagescript(
      ':a\n#idle\n',
      ':b\n#think\n',
      'replace_all',
    )
    expect(out).toBe(':b\n#think\n')
  })

  it('replace_handler swaps matching label block', () => {
    const code = ':think\n#idle\n:thud\n#die\n'
    const snippet = ':think\n?up\n'
    const out = patchcodepagescript(code, snippet, 'replace_handler')
    expect(out).toContain(':think\n?up\n')
    expect(out).toContain(':thud\n#die\n')
    expect(out).not.toContain(':think\n#idle\n')
  })
})
