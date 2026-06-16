import { fetchrefscrolltext } from 'zss/feature/fetchrefscrolltext'
import { znsread } from 'zss/feature/url'
import { romread } from 'zss/rom'

jest.mock('zss/feature/url', () => ({
  ZNS_DOCS_NAMESPACE: 'docs',
  znsread: jest.fn(() => Promise.resolve({})),
}))

jest.mock('zss/rom', () => ({
  romread: jest.fn(() => undefined),
}))

describe('fetchrefscrolltext', () => {
  beforeEach(() => {
    jest.mocked(znsread).mockReset().mockResolvedValue({})
    jest.mocked(romread).mockReset().mockReturnValue(undefined)
  })

  it('returns ZNS text when present', async () => {
    jest.mocked(znsread).mockResolvedValue({ value: '# zns doc' })
    const result = await fetchrefscrolltext('cliscroll')
    expect(znsread).toHaveBeenCalledWith('docs', 'cliscroll')
    expect(romread).not.toHaveBeenCalled()
    expect(result).toBe('# zns doc')
  })

  it('falls back to ROM when ZNS is empty', async () => {
    jest.mocked(romread).mockReturnValue('# rom doc')
    const result = await fetchrefscrolltext('cliscroll')
    expect(znsread).toHaveBeenCalledWith('docs', 'cliscroll')
    expect(romread).toHaveBeenCalledWith('refscroll:cliscroll')
    expect(result).toBe('# rom doc')
  })

  it('falls back to ROM when ZNS is whitespace only', async () => {
    jest.mocked(znsread).mockResolvedValue({ value: '   \n  ' })
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
    expect(znsread).not.toHaveBeenCalled()
    expect(romread).toHaveBeenCalledWith('refscroll:!!!')
    expect(result).toBe('# rom only')
  })
})
