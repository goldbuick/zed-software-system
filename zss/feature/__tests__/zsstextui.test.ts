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
      '$dkpurple+----+------+',
      '$dkpurple| $whiteid $dkpurple| $whitename $dkpurple|',
      '$dkpurple+----+------+',
      '$dkpurple| $gray1  $dkpurple| $grayone  $dkpurple|',
      '$dkpurple| $gray2  $dkpurple| $graytwo  $dkpurple|',
      '$dkpurple+----+------+',
    ])
  })

  it('zsstexttablelines header-less and ragged rows', () => {
    expect(zsstexttablelines([['x', 'y'], ['only']])).toEqual([
      '$dkpurple+------+---+',
      '$dkpurple| $grayx    $dkpurple| $grayy $dkpurple|',
      '$dkpurple| $grayonly $dkpurple| $gray  $dkpurple|',
      '$dkpurple+------+---+',
    ])
  })

  it('zsstexttablelines first line only and empty table', () => {
    expect(zsstexttablelines([['a\nb']], ['h'])).toEqual([
      '$dkpurple+---+',
      '$dkpurple| $whiteh $dkpurple|',
      '$dkpurple+---+',
      '$dkpurple| $graya $dkpurple|',
      '$dkpurple+---+',
    ])
    expect(zsstexttablelines([])).toEqual([])
  })
})
