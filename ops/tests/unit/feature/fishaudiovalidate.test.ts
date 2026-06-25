import {
  FISH_DEFAULT_MODEL,
  describefishconfig,
  isknownfishmodel,
  maskfishapikey,
} from 'zss/feature/fishaudio'

describe('fish config describe', () => {
  it('maskfishapikey redacts middle of long keys', () => {
    expect(maskfishapikey('409b8aba8e6143979f198905e680fe9b')).toBe(
      '409b…fe9b',
    )
    expect(maskfishapikey('')).toBe('(not set)')
    expect(maskfishapikey('short')).toBe('***')
  })

  it('isknownfishmodel recognizes canonical models', () => {
    expect(isknownfishmodel('s2.1-pro')).toBe(true)
    expect(isknownfishmodel('s2-pro')).toBe(true)
    expect(isknownfishmodel('unknown-model')).toBe(false)
  })

  it('describefishconfig returns model and masked key', () => {
    const result = describefishconfig('test-key', FISH_DEFAULT_MODEL)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.lines.join('\n')).toContain('model=s2.1-pro')
      expect(result.lines.join('\n')).toContain('api_key=')
      expect(result.lines.join('\n')).not.toContain('api credit')
    }
  })

  it('describefishconfig fails when api key missing', () => {
    const result = describefishconfig('', FISH_DEFAULT_MODEL)
    expect(result.ok).toBe(false)
  })
})
