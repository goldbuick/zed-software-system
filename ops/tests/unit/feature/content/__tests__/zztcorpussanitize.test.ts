import {
  corpuslineisallowlisted,
  CORPUS_REDACTED,
  corpustermmatchesline,
  corpusslurword,
  sanitizeline,
  sanitizesource,
} from 'ops/lib/content/zztcorpussanitize'

describe('zztcorpussanitize', () => {
  it('allowlists ZZT toolkit colored phrases', () => {
    expect(
      corpuslineisallowlisted('Empty: Colored empty, just place somethin'),
    ).toBe(true)
    expect(corpustermmatchesline('Empty: Colored empty, just place somethin')).toEqual(
      [],
    )
  })

  it('allowlists Moby Dick and :wop labels', () => {
    expect(corpustermmatchesline('Clue: Moby Dick poster')).toEqual([])
    expect(corpustermmatchesline(':wop')).toEqual([])
    expect(corpustermmatchesline('#if stop wop')).toEqual([])
  })

  it('redacts profanity in dialog', () => {
    expect(sanitizeline('The sign reads "Fuck You!"')).toBe(
      `The sign reads "${CORPUS_REDACTED} You!"`,
    )
  })

  it('renames slur stat tokens', () => {
    expect(sanitizeline('@Darkie')).toBe('@redacted')
    expect(sanitizeline('#bind whore')).toBe('#bind redacted')
    expect(sanitizeline(':nigger')).toBe(':redacted')
  })

  it('sanitizes multiline source', () => {
    const out = sanitizesource('@object\nHogan: THAT NIGGER?!!?\n')
    expect(out).toContain(`Hogan: THAT ${CORPUS_REDACTED}?!!?`)
  })

  it('flags racial and profanity terms', () => {
    expect(corpusslurword('nigger')).toBe(true)
    expect(corpustermmatchesline('some shit happens')).toContain('shit')
    expect(corpustermmatchesline('multi-colored torch')).toEqual([])
  })
})
