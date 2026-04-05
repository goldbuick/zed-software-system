import {
  DIVIDER,
  DOWN_SPOUT,
  UP_SPOUT,
  zssbbarline,
  zssheaderlines,
  zssoptionline,
  zsssectionlines,
  zsstbarline,
  zsstextline,
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
    expect(zssoptionline('1', 'go')).toBe(
      '$dkpurple $white1 $bluego',
    )
    expect(zsstextline('msg')).toBe('$dkpurple$bluemsg')
  })
})
