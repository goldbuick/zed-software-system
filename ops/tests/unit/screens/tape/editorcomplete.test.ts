import * as lexer from 'zss/feature/lang/backend/typescript/lexer'
import type { EDITOR_CODE_ROW } from 'zss/screens/tape/common'
import { buildeditorcompletecontext } from 'zss/screens/tape/editorcomplete'

describe('buildeditorcompletecontext', () => {
  it('collects :label names with colon prefix', () => {
    const rows: EDITOR_CODE_ROW[] = [
      {
        start: 0,
        code: ':foo\n',
        end: 4,
        tokens: [
          {
            image: ':foo',
            startColumn: 1,
            tokenTypeIdx: lexer.label.tokenTypeIdx ?? 0,
          },
        ],
      },
    ]
    const ctx = buildeditorcompletecontext(rows)
    expect(ctx.labels).toEqual([':foo'])
  })

  it('collects variable names from #set', () => {
    const rows: EDITOR_CODE_ROW[] = [
      {
        start: 0,
        code: '#set score 1\n',
        end: 11,
        tokens: [
          {
            image: '#',
            startColumn: 1,
            tokenTypeIdx: lexer.command.tokenTypeIdx ?? 0,
          },
          {
            image: 'set',
            startColumn: 2,
            tokenTypeIdx: lexer.text.tokenTypeIdx ?? 0,
          },
          {
            image: 'score',
            startColumn: 6,
            tokenTypeIdx: lexer.text.tokenTypeIdx ?? 0,
          },
        ],
      },
    ]
    const ctx = buildeditorcompletecontext(rows)
    expect(ctx.variables).toEqual(['score'])
  })
})
