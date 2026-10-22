import {
  type SLUR_FILTER_TABLE,
  type SLUR_FILTER_TIER,
  slurfilterbigramallowed,
  slurfilterfold,
  slurfilterhash,
  slurfilterstripformat,
  slurfiltertokentier,
  textmatchesdigests,
} from 'zss/feature/slurfilter'

function maketable(
  words: [string, SLUR_FILTER_TIER][],
  bigrams: string[] = [],
): SLUR_FILTER_TABLE {
  return {
    tiers: Object.fromEntries(
      words.map(([word, tier]) => [slurfilterhash(word), tier]),
    ),
    allowbigrams: new Set(bigrams.map((pair) => slurfilterhash(pair))),
    allowlabels: new Set(),
  }
}

const TABLE = maketable(
  [
    ['banana', 'slur'],
    ['box', 'slur'],
    ['gecko', 'ambiguous'],
    ['durian', 'mild'],
  ],
  ['moby banana'],
)

function chatdrops(text: string) {
  return textmatchesdigests(text, TABLE, ['slur'])
}

describe('slurfilter', () => {
  it('hashes deterministically', () => {
    expect(slurfilterhash('banana')).toBe(slurfilterhash('banana'))
    expect(slurfilterhash('banana')).not.toBe(slurfilterhash('bananas'))
  })

  it('matches whole words case-insensitively', () => {
    expect(chatdrops('I like banana bread')).toBe(true)
    expect(chatdrops('BANANA!')).toBe(true)
    expect(chatdrops('hello there')).toBe(false)
  })

  it('matches s and es plurals', () => {
    expect(chatdrops('two bananas')).toBe(true)
    expect(chatdrops('many boxes')).toBe(true)
    expect(slurfiltertokentier('boxes', TABLE)).toBe('slur')
  })

  it('misses longer words that only contain a term', () => {
    expect(chatdrops('bananarama')).toBe(false)
    expect(chatdrops('xbananax')).toBe(false)
  })

  it('cannot be split by color tokens', () => {
    expect(slurfilterstripformat('ba$rednana')).toBe('banana')
    expect(chatdrops('ba$rednana')).toBe(true)
    expect(chatdrops('$ONBLUEban$WHITEana')).toBe(true)
  })

  it('reads printable $NNN char codes as letters', () => {
    expect(chatdrops('$98anana')).toBe(true)
    expect(slurfilterstripformat('a$1b')).toBe('a b')
  })

  it('folds accented letters', () => {
    expect(slurfilterfold('bánáná')).toBe('banana')
    expect(chatdrops('bánáná')).toBe(true)
  })

  it('only drops chat on the requested tiers', () => {
    expect(chatdrops('a gecko and a durian')).toBe(false)
    expect(textmatchesdigests('a gecko', TABLE)).toBe(true)
  })

  it('honors allowlisted bigrams', () => {
    expect(slurfilterbigramallowed('Moby', 'Banana', TABLE)).toBe(true)
    expect(chatdrops('Moby Banana poster')).toBe(false)
    expect(chatdrops('Moby Banana and a banana')).toBe(true)
  })
})
