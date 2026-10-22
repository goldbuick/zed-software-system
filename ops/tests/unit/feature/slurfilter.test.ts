import {
  type SLUR_FILTER_TABLE,
  type SLUR_FILTER_TIER,
  slurfilterbigramallowed,
  slurfilterfold,
  slurfilterhash,
  slurfilterstripformat,
  slurfiltertokentier,
  textmatchesdigests,
  textmatchesvariants,
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
    ['durian', 'ambiguous'],
  ],
  ['moby banana'],
)

function chatdrops(text: string) {
  return textmatchesdigests(text, TABLE, ['slur'])
}

function variantdrops(text: string) {
  return textmatchesvariants(text, TABLE, ['slur'])
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

  it('catches digit and symbol swaps in chat', () => {
    expect(variantdrops('b4n4n4')).toBe(true)
    expect(variantdrops('b@nan@')).toBe(true)
    expect(variantdrops('b0x')).toBe(true)
    expect(variantdrops('banana123')).toBe(true)
    expect(variantdrops('!banana!')).toBe(true)
    expect(variantdrops('room 101')).toBe(false)
  })

  it('catches stretched letters in chat', () => {
    expect(variantdrops('baaaanaaanaaa')).toBe(true)
    expect(variantdrops('bbbooox')).toBe(true)
  })

  it('catches spaced-out letters in chat', () => {
    expect(variantdrops('b a n a n a')).toBe(true)
    expect(variantdrops('b.a.n.a.n.a')).toBe(true)
    expect(variantdrops('b-0-x')).toBe(true)
    expect(variantdrops('a b c d')).toBe(false)
    expect(variantdrops('b ox')).toBe(false)
  })

  it('keeps tier and allowlist rules for variants', () => {
    expect(variantdrops('g3ck0')).toBe(false)
    expect(textmatchesvariants('g3ck0', TABLE)).toBe(true)
    expect(variantdrops('Moby B4nana poster')).toBe(false)
    expect(variantdrops('hello there')).toBe(false)
  })

  it('honors allowlisted bigrams', () => {
    expect(slurfilterbigramallowed('Moby', 'Banana', TABLE)).toBe(true)
    expect(chatdrops('Moby Banana poster')).toBe(false)
    expect(chatdrops('Moby Banana and a banana')).toBe(true)
  })
})
