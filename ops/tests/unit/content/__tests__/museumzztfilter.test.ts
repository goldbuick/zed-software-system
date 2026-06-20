import {
  filtervanillazztworlds,
  isvanillazztworld,
  type MuseumFile,
} from '../../../../../tasks/implementations/content/museum-zzt-filter'

function sample(partial: Partial<MuseumFile> & Pick<MuseumFile, 'details'>): MuseumFile {
  return {
    letter: '1',
    filename: 'sample.zip',
    title: 'Sample',
    author: ['Author'],
    genres: ['Action'],
    checksum: 'abc123',
    archive_name: 'zzt_sample',
    size: 1000,
    ...partial,
  }
}

describe('museum-zzt-filter', () => {
  it('accepts pure ZZT World entries from museum API samples', () => {
    expect(
      isvanillazztworld(
        sample({
          letter: 'l',
          filename: 'lashooot.zip',
          archive_name: 'zzt_lashooot',
          details: [
            { id: 29, detail: 'Text' },
            { id: 15, detail: 'ZZT World' },
          ],
        }),
      ),
    ).toBe(true)
    expect(
      isvanillazztworld(
        sample({
          letter: '1',
          filename: '0x0C.zip',
          archive_name: 'zzt_0x0C',
          details: [{ id: 15, detail: 'ZZT World' }],
        }),
      ),
    ).toBe(true)
  })

  it('rejects Weave ZZT World and wzzt_ archive names', () => {
    expect(
      isvanillazztworld(
        sample({
          filename: 'NUMPLAY6_museum.zip',
          archive_name: 'wzzt_NUMPLAY6_museum',
          details: [
            { id: 33, detail: 'Program' },
            { id: 37, detail: 'Weave ZZT World' },
            { id: 21, detail: 'ZZT Board' },
          ],
        }),
      ),
    ).toBe(false)
    expect(
      isvanillazztworld(
        sample({
          archive_name: 'wzzt_hidden',
          details: [{ id: 15, detail: 'ZZT World' }],
        }),
      ),
    ).toBe(false)
  })

  it('rejects Super ZZT and dual-tagged compilations', () => {
    expect(
      isvanillazztworld(
        sample({
          filename: 'BATMAN.ZIP',
          archive_name: 'szzt_batman',
          details: [{ id: 16, detail: 'Super ZZT World' }],
        }),
      ),
    ).toBe(false)
    expect(
      isvanillazztworld(
        sample({
          filename: 'aolcompilation.zip',
          archive_name: 'zzt_aolcompilation',
          details: [
            { id: 15, detail: 'ZZT World' },
            { id: 16, detail: 'Super ZZT World' },
          ],
        }),
      ),
    ).toBe(false)
    expect(
      isvanillazztworld(
        sample({
          filename: 'dutchco2.zip',
          archive_name: 'zzt_dutchco2',
          details: [
            { id: 15, detail: 'ZZT World' },
            { id: 16, detail: 'Super ZZT World' },
          ],
        }),
      ),
    ).toBe(false)
  })

  it('rejects dual Weave + ZZT World tags', () => {
    expect(
      isvanillazztworld(
        sample({
          filename: 'fire1000.zip',
          archive_name: 'wzzt_fire1000',
          details: [
            { id: 15, detail: 'ZZT World' },
            { id: 37, detail: 'Weave ZZT World' },
          ],
        }),
      ),
    ).toBe(false)
  })

  it('rejects standalone ZZT Board uploads without ZZT World', () => {
    expect(
      isvanillazztworld(
        sample({
          details: [{ id: 21, detail: 'ZZT Board' }],
        }),
      ),
    ).toBe(false)
  })

  it('aggregates filter stats', () => {
    const entries = [
      sample({ details: [{ id: 15, detail: 'ZZT World' }] }),
      sample({
        details: [{ id: 37, detail: 'Weave ZZT World' }],
      }),
      sample({
        details: [{ id: 16, detail: 'Super ZZT World' }],
      }),
      sample({ details: [{ id: 29, detail: 'Text' }] }),
    ]
    const { included, stats } = filtervanillazztworlds(entries)
    expect(included).toHaveLength(1)
    expect(stats).toEqual({
      catalog_total: 4,
      included: 1,
      excluded_weave: 1,
      excluded_super: 1,
      excluded_no_zzt_world: 1,
    })
  })
})
