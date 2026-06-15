import { fetchrefscrolltext } from 'zss/feature/fetchrefscrolltext'
import { fetchznstext, znsdocsfetchenabled } from 'zss/feature/url'
import { romread } from 'zss/rom'

jest.mock('zss/feature/url', () => ({
  ZNS_DOCS_NAMESPACE: 'docs',
  fetchznstext: jest.fn(() => Promise.resolve('')),
  znsdocsfetchenabled: jest.fn(() => true),
}))

jest.mock('zss/rom', () => ({
  romread: jest.fn(() => undefined),
}))

describe('fetchrefscrolltext', () => {
  beforeEach(() => {
    jest.mocked(fetchznstext).mockReset().mockResolvedValue('')
    jest.mocked(znsdocsfetchenabled).mockReset().mockReturnValue(true)
    jest.mocked(romread).mockReset().mockReturnValue(undefined)
  })

  it('returns ZNS text when present', async () => {
    jest.mocked(fetchznstext).mockResolvedValue('# zns doc')
    const result = await fetchrefscrolltext('cliscroll')
    expect(fetchznstext).toHaveBeenCalledWith('docs', 'cliscroll')
    expect(romread).not.toHaveBeenCalled()
    expect(result).toBe('# zns doc')
  })

  it('falls back to ROM when ZNS is empty', async () => {
    jest.mocked(romread).mockReturnValue('# rom doc')
    const result = await fetchrefscrolltext('cliscroll')
    expect(fetchznstext).toHaveBeenCalledWith('docs', 'cliscroll')
    expect(romread).toHaveBeenCalledWith('refscroll:cliscroll')
    expect(result).toBe('# rom doc')
  })

  it('falls back to ROM when ZNS is whitespace only', async () => {
    jest.mocked(fetchznstext).mockResolvedValue('   \n  ')
    jest.mocked(romread).mockReturnValue('# rom doc')
    const result = await fetchrefscrolltext('cliscroll')
    expect(result).toBe('# rom doc')
  })

  it('returns empty when both ZNS and ROM miss', async () => {
    const result = await fetchrefscrolltext('missing')
    expect(result).toBe('')
  })

  it('skips ZNS for invalid slug and tries ROM', async () => {
    jest.mocked(romread).mockReturnValue('# rom only')
    const result = await fetchrefscrolltext('!!!')
    expect(fetchznstext).not.toHaveBeenCalled()
    expect(romread).toHaveBeenCalledWith('refscroll:!!!')
    expect(result).toBe('# rom only')
  })

  it('skips ZNS fetch when docs fetch is disabled and uses ROM', async () => {
    jest.mocked(znsdocsfetchenabled).mockReturnValue(false)
    jest.mocked(romread).mockReturnValue('# rom doc')
    const result = await fetchrefscrolltext('cliscroll')
    expect(fetchznstext).not.toHaveBeenCalled()
    expect(result).toBe('# rom doc')
  })
})
