import {
  sortzipfilesforimport,
  zipfileimportpriority,
} from 'zss/feature/parse/file'

describe('zipfile import order', () => {
  it('prioritizes worlds then charset formats then everything else', () => {
    expect(zipfileimportpriority('zzt')).toBe(0)
    expect(zipfileimportpriority('szt')).toBe(0)
    expect(zipfileimportpriority('brd')).toBe(0)
    expect(zipfileimportpriority('fontcom')).toBe(1)
    expect(zipfileimportpriority('chr')).toBe(1)
    expect(zipfileimportpriority('txt')).toBe(2)
    expect(zipfileimportpriority('obj')).toBe(2)
  })

  it('sorts marked files worlds then charset then rest, stable by name', () => {
    const files = [
      new File([], 'Pokemon1.txt', { type: 'text/plain' }),
      new File([], 'Pokemon.com', { type: 'application/octet-stream' }),
      new File([], 'POKEMON1.ZZT', { type: 'application/x-zzt' }),
      new File([], 'extra.chr', { type: 'application/octet-stream' }),
      new File([], 'notes.ini', { type: 'text/x-ini' }),
    ]
    const ordered = sortzipfilesforimport(files)
    expect(ordered.map((f) => f.name)).toEqual([
      'POKEMON1.ZZT',
      'extra.chr',
      'Pokemon.com',
      'notes.ini',
      'Pokemon1.txt',
    ])
    expect(zipfileimportpriority('zzt')).toBeLessThan(
      zipfileimportpriority('chr'),
    )
    expect(zipfileimportpriority('chr')).toBeLessThan(
      zipfileimportpriority('txt'),
    )
  })
})
