import {
  CORPUS_REDACTED,
  corpuslineisallowlisted,
  corpuslinetiers,
  sanitizeline,
  sanitizesource,
} from 'ops/lib/content/zztcorpussanitize'
import { slurfilterhash } from 'zss/feature/slurfilter'

// neutral stand-ins so no listed word appears in the repo
jest.mock('zss/feature/slurfilterdigests', () => ({
  SLUR_FILTER_ENTRIES: [
    ['26zxyryqhbr', 'slur'],
    ['25lzsg2dx1g', 'slur'],
    ['1l18sa834v4', 'ambiguous'],
    ['gbq4ytytea', 'ambiguous'],
  ],
  SLUR_FILTER_ALLOW_BIGRAMS: ['8ozcrnsgp7'],
  SLUR_FILTER_ALLOW_LABELS: ['gbq4ytytea'],
}))

describe('zztcorpussanitize', () => {
  it('uses digests of the neutral stand-in words', () => {
    expect(slurfilterhash('banana')).toBe('26zxyryqhbr')
    expect(slurfilterhash('cherry')).toBe('25lzsg2dx1g')
    expect(slurfilterhash('durian')).toBe('1l18sa834v4')
    expect(slurfilterhash('gecko')).toBe('gbq4ytytea')
    expect(slurfilterhash('stop gecko')).toBe('8ozcrnsgp7')
  })

  it('allowlists ZZT toolkit colored phrases', () => {
    expect(
      corpuslineisallowlisted('Empty: Colored empty, just place somethin'),
    ).toBe(true)
    expect(corpuslinetiers('multi-colored torch')).toEqual([])
  })

  it('allowlists hashed bigrams and labels', () => {
    expect(corpuslinetiers(':gecko')).toEqual([])
    expect(corpuslinetiers('#if stop gecko')).toEqual([])
    expect(sanitizeline('#if stop gecko')).toBe('#if stop gecko')
    expect(corpuslinetiers('a gecko appears')).toEqual(['ambiguous'])
  })

  it('redacts words in dialog', () => {
    expect(sanitizeline('The sign reads "Cherry You!"')).toBe(
      `The sign reads "${CORPUS_REDACTED} You!"`,
    )
    expect(sanitizeline('two durians')).toBe(`two ${CORPUS_REDACTED}`)
  })

  it('leaves identifiers that only contain a word', () => {
    expect(sanitizeline('#send cherry_gate')).toBe('#send cherry_gate')
    expect(sanitizeline('cherry2')).toBe('cherry2')
  })

  it('renames stat, label, and bind tokens', () => {
    expect(sanitizeline('@Banana')).toBe('@redacted')
    expect(sanitizeline('#bind cherry')).toBe('#bind redacted')
    expect(sanitizeline(':banana')).toBe(':redacted')
  })

  it('sanitizes multiline source', () => {
    const out = sanitizesource('@object\nHogan: THAT BANANA?!!?\n')
    expect(out).toContain(`Hogan: THAT ${CORPUS_REDACTED}?!!?`)
  })

  it('reports one tier per matching word', () => {
    expect(corpuslinetiers('banana and cherry')).toEqual(['slur', 'slur'])
    expect(corpuslinetiers('hello world')).toEqual([])
  })
})
