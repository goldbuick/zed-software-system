import {
  textformatlinehtml,
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

  it('omits cafe-only editor input widgets', () => {
    expect(zedzedlinkrowhtml('!char charedit;char', { tenantbase: '/' })).toBe(
      '',
    )
    expect(
      zedzedlinkrowhtml('!char charedit hk a " A " next;char', {
        tenantbase: '/',
      }),
    ).toBe('')
    expect(
      zedzedlinkrowhtml('!color coloredit hk c " C " next;color', {
        tenantbase: '/',
      }),
    ).toBe('')
    expect(
      zedzedlinkrowhtml('!bg bgedit hk b " B " next;bg', { tenantbase: '/' }),
    ).toBe('')
  })

  it('omits flagorstat-style input hyperlinks', () => {
    expect(zedzedlinkrowhtml('!flag text;name', { tenantbase: '/' })).toBe('')
    expect(zedzedlinkrowhtml('!flag number;count', { tenantbase: '/' })).toBe(
      '',
    )
  })

  it('alternates badge backgrounds by iseven (ltgray / dkcyan)', () => {
    const even = zedzedlinkrowhtml('!helpmenu hk 1 " 1 " next;controls', {
      tenantbase: '/',
      iseven: true,
    })
    const odd = zedzedlinkrowhtml('!helpmenu hk 1 " 1 " next;controls', {
      tenantbase: '/',
      iseven: false,
    })
    expect(even).toContain('background-color:#aaaaaa')
    expect(odd).toContain('background-color:#00aaaa')
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
    expect(html).not.toContain('> A <')
    expect(html).toContain('plain')
  })

  it('zedtaperowshtml skips omitted input widgets for badge alternation', () => {
    const html = zedtaperowshtml(
      [
        '!helpmenu hk 1 " 1 " next;one',
        '!char charedit hk a " A " next;char',
        '!cliscroll hk 2 " 2 " next;two',
      ].join('\n'),
      { tenantbase: '/' },
    )
    expect(html).not.toContain('> A <')
    expect(html).not.toMatch(/>\s*char\s*</)
    const bgs = [...html.matchAll(/background-color:(#[0-9a-f]+)/g)].map(
      (m) => m[1],
    )
    expect(bgs[0]).toBe('#aaaaaa')
    expect(bgs[1]).toBe('#00aaaa')
  })

  it('zedtaperowshtml alternates badge colors across link rows, skipping blanks', () => {
    const html = zedtaperowshtml(
      [
        '!helpmenu hk 1 " 1 " next;one',
        '',
        '!cliscroll hk 2 " 2 " next;two',
      ].join('\n'),
      { tenantbase: '/' },
    )
    const bgs = [...html.matchAll(/background-color:(#[0-9a-f]+)/g)].map(
      (m) => m[1],
    )
    expect(bgs[0]).toBe('#aaaaaa')
    expect(bgs[1]).toBe('#00aaaa')
  })

  it('zedtapehtml keeps passthrough menu bang lines as links', () => {
    const html = zedtapehtml(
      '!helpmenu hk 1 " 1 " next;controls and $greenstart here\n',
      { tenantbase: '/' },
    )
    expect(html).toContain('href="/helpmenu"')
    expect(html).not.toContain('!helpmenu hk')
  })

  it('renders copyit as clipboard button with payload in data-copy', () => {
    const html = zedzedlinkrowhtml(
      '!copyit #play cdefgab+c;$greenC major',
      { tenantbase: '/' },
    )
    expect(html).toContain('class="zns-copy"')
    expect(html).toContain('data-copy="#play cdefgab+c"')
    expect(html).toContain('C major')
    expect(html).toContain('COPYIT')
    expect(html).not.toContain('!copyit')
    expect(html).not.toContain('href=')
  })

  it('preserves spaces in quoted copyit payloads', () => {
    const html = zedzedlinkrowhtml('!copyit "hello world";Label', {
      tenantbase: '/',
    })
    expect(html).toContain('class="zns-copy"')
    expect(html).toContain('data-copy="hello world"')
    expect(html).toContain('Label')
    expect(html).not.toContain('!copyit')
  })

  it('keeps bang flats inside copyit play payloads', () => {
    const html = zedzedlinkrowhtml(
      '!copyit #play d!e!fg!a!b!c+d!;$greenDb major',
      { tenantbase: '/' },
    )
    expect(html).toContain('class="zns-copy"')
    expect(html).toContain('data-copy="#play d!e!fg!a!b!c+d!"')
    expect(html).toContain('Db major')
    expect(html).toContain('COPYIT')
  })
})

describe('zns-zedhtml $meta', () => {
  it('expands $meta to a .zns-meta span (default ctrl, client swaps cmd)', () => {
    const html = textformatlinehtml('$white$meta+h')
    expect(html).toContain('zns-meta')
    expect(html).toContain('>ctrl<')
    expect(html).toContain('+h')
    expect(html).not.toContain('$meta')
  })

  it('does not treat $meta as a color name leftover', () => {
    const html = textformatlinehtml('right trigger - $green$meta')
    expect(html).toContain('zns-meta')
    expect(html).not.toMatch(/\$meta/)
  })
})

describe('zns-zedhtml openit+hk', () => {
  it('renders openit with hk as badge link and strips hk from href', () => {
    const html = zedzedlinkrowhtml(
      '!openit https://zed.cafe/docs/firmware/cli/ hk c " C " next;CLI',
      { tenantbase: '/', iseven: true },
    )
    expect(html).toContain('href="https://zed.cafe/docs/firmware/cli/"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('> C <')
    expect(html).toContain('CLI')
    expect(html).not.toContain(' hk ')
    expect(html).not.toContain('OPENIT')
  })

  it('routes openit+hk lines through zedtaperowshtml with badges', () => {
    const html = zedtaperowshtml(
      '!openit https://zed.cafe/docs/firmware/loader/ hk o " O " next;LOADER\n',
      { tenantbase: '/' },
    )
    expect(html).toContain('href="https://zed.cafe/docs/firmware/loader/"')
    expect(html).toContain('> O <')
    expect(html).toContain('LOADER')
  })
})
