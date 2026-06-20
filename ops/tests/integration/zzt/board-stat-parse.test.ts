import { stat, tokenize } from 'zss/feature/lang/backend/typescript/lexer'

it('parses @board stat line', () => {
  const code = '@board 000. Title\n@zztboard0\n@exitnorth zztboard1\n'
  const parse = tokenize(code)
  const stats = parse.tokens
    .filter((t) => t.tokenType === stat)
    .map((t) => t.image)
  expect(stats).toEqual([
    '@board 000. Title',
    '@zztboard0',
    '@exitnorth zztboard1',
  ])
})
