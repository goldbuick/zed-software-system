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

  it('renders bare editor widgets as hotkey badge chrome without href', () => {
    const html = zedzedlinkrowhtml('!char charedit;char', { tenantbase: '/' })
    expect(html).toContain('> A <')
    expect(html).toContain('char')
    expect(html).toContain('background-color:#00aaaa')
    expect(html).not.toContain('href=')
    expect(html).not.toContain('!char')
  })

  it('renders menu editor+hk lines as badge + label without href', () => {
    const charhtml = zedzedlinkrowhtml(
      '!char charedit hk a " A " next;char',
      { tenantbase: '/' },
    )
    expect(charhtml).toContain('> A <')
    expect(charhtml).toContain('char')
    expect(charhtml).not.toContain('href=')
    expect(charhtml).not.toContain('!char')

    const colorhtml = zedzedlinkrowhtml(
      '!color coloredit hk c " C " next;color',
      { tenantbase: '/' },
    )
    expect(colorhtml).toContain('> C <')
    expect(colorhtml).toContain('color')
    expect(colorhtml).not.toContain('href=')
    expect(colorhtml).not.toContain('!color')

    const bghtml = zedzedlinkrowhtml('!bg bgedit hk b " B " next;bg', {
      tenantbase: '/',
    })
    expect(bghtml).toContain('> B <')
    expect(bghtml).toContain('bg')
    expect(bghtml).not.toContain('href=')
    expect(bghtml).not.toContain('!bg')
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
    expect(html).toContain('plain')
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
