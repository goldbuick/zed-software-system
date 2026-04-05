import {
  DIVIDER,
  DOWN_SPOUT,
  UP_SPOUT,
  iszedlinkline,
  zssbbarline,
  zssboxinnerwidth,
  zssheaderlines,
  zssoptionline,
  zsssectionlines,
  zsstbarline,
  zsstextline,
  zsstexttablelines,
  zsstexttape,
  zsszedlinkline,
  zsszedlinklinechip,
  zsszedlinklines,
} from 'zss/feature/zsstextui'
import { BOARD_WIDTH } from 'zss/memory/types'

describe('zsstextui', () => {
  it('exports divider and spouts', () => {
    expect(DIVIDER).toBe('$yellow$205$205$205$196')
    expect(DOWN_SPOUT).toBe('$196$191')
    expect(UP_SPOUT).toBe('$192$196')
  })

  it('zsstbarline and zssbbarline', () => {
    expect(zsstbarline(3)).toBe('$dkpurple$196$196$196')
    expect(zssbbarline(2)).toBe('$dkpurple$205$205')
  })

  it('zssheaderlines is three lines matching former writeheader', () => {
    expect(zssheaderlines('Hi')).toEqual([
      '$dkpurple$196$196$196$196',
      '$dkpurple $whiteHi ',
      '$dkpurple$205$205$205$205',
    ])
  })

  it('zsssectionlines', () => {
    expect(zsssectionlines('ab')).toEqual([
      '$dkpurple    ',
      '$dkpurple $grayab ',
      '$dkpurple$205$205$205$205',
    ])
  })

  it('zssoptionline and zsstextline', () => {
    expect(zssoptionline('1', 'go')).toBe('$dkpurple $white1 $bluego')
    expect(zsstextline('msg')).toBe('$dkpurple$bluemsg')
  })

  it('zssboxinnerwidth is title length plus two padding cells', () => {
    expect(zssboxinnerwidth('Hi')).toBe(4)
    expect(zssboxinnerwidth('')).toBe(2)
    expect(zssheaderlines('Hi')[0]).toBe(zsstbarline(zssboxinnerwidth('Hi')))
  })

  it('iszedlinkline matches trimmed bang lines with semicolon', () => {
    expect(iszedlinkline('!a;b')).toBe(true)
    expect(iszedlinkline('  !x y;$z')).toBe(true)
    expect(iszedlinkline('!nosemi')).toBe(false)
    expect(iszedlinkline('plain')).toBe(false)
  })

  it('zsszedlinkline escapes semicolons in command and label', () => {
    expect(zsszedlinkline('a;b', 'c;d')).toBe('!a$59b;c$59d')
  })

  it('zsszedlinklinechip matches scroll tape !@chip encoding', () => {
    expect(zsszedlinklinechip('otherchip', 'z w', 'lbl')).toBe(
      '!@otherchip z w;lbl',
    )
    expect(zsszedlinklinechip('batch', 'a;b', 'c;d')).toBe(
      '!@batch a$59b;c$59d',
    )
  })

  it('zsszedlinklines maps command/label rows', () => {
    expect(
      zsszedlinklines([
        { command: 'a;b', label: 'c' },
        { command: 'x', label: 'y' },
      ]),
    ).toEqual(['!a$59b;c', '!x;y'])
  })

  it('zsstexttape flattens strings and arrays', () => {
    expect(zsstexttape('a', ['b', 'c'], 'd')).toBe('a\nb\nc\nd')
    const hx = zssheaderlines('x')
    expect(zsstexttape(hx, ['y'])).toBe(`${hx.join('\n')}\ny`)
  })

  it('zsstexttablelines builds a bordered grid with header and body styles', () => {
    expect(
      zsstexttablelines(
        [
          ['1', 'one'],
          ['2', 'two'],
        ],
        ['id', 'name'],
      ),
    ).toEqual([
      '$dkpurple$218----$194------$191',
      '$dkpurple| $ondkblue$whiteid $dkpurple| $ondkblue$whitename $dkpurple|',
      '$dkpurple$195----$197------$180',
      '$dkpurple| $onblack$gray1  $dkpurple| $onblack$grayone  $dkpurple|',
      '$dkpurple| $ondkblue$gray2  $dkpurple| $ondkblue$graytwo  $dkpurple|',
      '$dkpurple$192----$193------$217',
    ])
  })

  it('zsstexttablelines header-less and ragged rows', () => {
    expect(zsstexttablelines([['x', 'y'], ['only']])).toEqual([
      '$dkpurple$218------$194---$191',
      '$dkpurple| $ondkblue$grayx    $dkpurple| $ondkblue$grayy $dkpurple|',
      '$dkpurple| $onblack$grayonly $dkpurple| $onblack$gray  $dkpurple|',
      '$dkpurple$192------$193---$217',
    ])
  })

  it('zsstexttablelines first line only and empty table', () => {
    expect(zsstexttablelines([['a\nb']], ['h'])).toEqual([
      '$dkpurple$218---$191',
      '$dkpurple| $ondkblue$whiteh $dkpurple|',
      '$dkpurple$195---$180',
      '$dkpurple| $onblack$graya $dkpurple|',
      '$dkpurple$192---$217',
    ])
    expect(zsstexttablelines([])).toEqual([])
  })

  it('zsstexttablelines aligns by drawn width when cells contain zsstext codes', () => {
    expect(
      zsstexttablelines(
        [
          ['$greenhi', 'x'],
          ['no', '$redy'],
        ],
        ['a', 'b'],
      ),
    ).toEqual([
      '$dkpurple$218----$194---$191',
      '$dkpurple| $ondkblue$whitea  $dkpurple| $ondkblue$whiteb $dkpurple|',
      '$dkpurple$195----$197---$180',
      '$dkpurple| $onblack$gray$greenhi $dkpurple| $onblack$grayx $dkpurple|',
      '$dkpurple| $ondkblue$grayno $dkpurple| $ondkblue$gray$redy $dkpurple|',
      '$dkpurple$192----$193---$217',
    ])
  })

  it('zsstexttablelines clamps so ASCII rule fits BOARD_WIDTH and wraps cells', () => {
    const longa = 'a'.repeat(80)
    const longb = 'b'.repeat(80)
    const lines = zsstexttablelines([[longa, longb]], ['c', 'd'])
    const stripzs = (s: string) => s.replace(/\$[a-zA-Z0-9]+/g, '')
    for (let i = 0; i < lines.length; ++i) {
      expect(stripzs(lines[i]).length).toBeLessThanOrEqual(BOARD_WIDTH)
    }
    expect(lines.length).toBeGreaterThan(5)
    expect(lines.some((ln) => ln.includes('aaa'))).toBe(true)
    expect(lines.some((ln) => ln.includes('bbb'))).toBe(true)
  })
})
