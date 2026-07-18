import {
  zedtapehtml,
  zedtaperowshtml,
  zedzedlinkrowhtml,
} from '../../../infra/zns-zedhtml.js'

describe('zns-zedhtml hyperlinks', () => {
  it('renders hk scroll links as badge + label with tenant href', () => {
    const html = zedzedlinkrowhtml(
      '!helpmenu hk 1 " 1 " next;controls and $greenstart here',
      { tenantbase: '/' },
    )
    expect(html).toContain('href="/helpmenu"')
    expect(html).toContain('class="zns-link"')
    expect(html).toContain('controls and')
    expect(html).toContain('start here')
    expect(html).not.toContain('!helpmenu')
  })

  it('renders plain hyperlinks to path keys', () => {
    const html = zedzedlinkrowhtml('!cliscroll;cli commands', {
      tenantbase: '/',
    })
    expect(html).toContain('href="/cliscroll"')
    expect(html).toContain('cli commands')
    expect(html).not.toContain('!cliscroll')
  })

  it('renders editor widgets as label chrome without href', () => {
    const html = zedzedlinkrowhtml('!char charedit;char', { tenantbase: '/' })
    expect(html).toContain('char')
    expect(html).not.toContain('href=')
    expect(html).not.toContain('!char')
  })

  it('zedtaperowshtml routes bang lines through link renderer', () => {
    const html = zedtaperowshtml(
      [
        '!helpmenu hk 1 " 1 " next;controls',
        '!char charedit;char',
        '$whiteplain',
      ].join('\n'),
      { tenantbase: '/' },
    )
    expect(html).toContain('href="/helpmenu"')
    expect(html).not.toContain('!helpmenu')
    expect(html).not.toContain('!char')
    expect(html).toContain('plain')
  })

  it('zedtapehtml keeps passthrough menu bang lines as links', () => {
    const html = zedtapehtml(
      '!helpmenu hk 1 " 1 " next;controls and $greenstart here\n',
      { tenantbase: '/' },
    )
    expect(html).toContain('href="/helpmenu"')
    expect(html).not.toContain('!helpmenu hk')
  })
})
