import type { COMMAND_ARGS_SIGNATURE } from 'zss/firmware'
import * as lexer from 'zss/lang/lexer'
import { tokenize } from 'zss/lang/lexer'
import {
  commandarggroupstarts,
  computecommandnexthint,
  splitcommandsignature,
} from '../commandarghints'
import { ARG_TYPE } from 'zss/words/types'

function linetokens(line: string) {
  const r = tokenize(`${line}\n`)
  return (r.tokens ?? []).filter((t) => (t.startLine ?? 1) === 1)
}

function activetokenidxforcolumn(tokens: ReturnType<typeof linetokens>, col: number) {
  const cursor = col + 1
  let activetokenidx = -1
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t]
    const startx = tok.startColumn ?? 1
    if (startx <= cursor && tok.tokenTypeIdx !== lexer.newline.tokenTypeIdx) {
      activetokenidx = t
    } else if (startx > cursor) {
      break
    }
  }
  if (
    activetokenidx > 0 &&
    tokens[activetokenidx].tokenTypeIdx === lexer.newline.tokenTypeIdx
  ) {
    activetokenidx -= 1
  }
  return activetokenidx
}

describe('splitcommandsignature', () => {
  it('splits ARG_TYPE list and prose tail', () => {
    const sig: COMMAND_ARGS_SIGNATURE = [
      ARG_TYPE.NAME,
      ARG_TYPE.ANY,
      'give the value',
    ]
    const { argtypes, prosehint } = splitcommandsignature(sig)
    expect(argtypes).toEqual([ARG_TYPE.NAME, ARG_TYPE.ANY])
    expect(prosehint).toBe('give the value')
  })
})

describe('commandarggroupstarts', () => {
  it('finds one group per spaced word after command name', () => {
    const tokens = linetokens('# give foo bar')
    const cmdidx = tokens.findIndex(
      (t) => t.tokenTypeIdx === lexer.command.tokenTypeIdx,
    )
    expect(cmdidx).toBeGreaterThanOrEqual(0)
    const starts = commandarggroupstarts(tokens, cmdidx)
    expect(starts.length).toBe(2)
  })
})

describe('computecommandnexthint', () => {
  it('expects first arg while typing the command name', () => {
    const tokens = linetokens('# give')
    const cmdidx = tokens.findIndex(
      (t) => t.tokenTypeIdx === lexer.command.tokenTypeIdx,
    )
    const col = 2
    const active = activetokenidxforcolumn(tokens, col)
    const cursor = col + 1
    const hint = computecommandnexthint(
      tokens,
      cmdidx,
      active,
      cursor,
      [ARG_TYPE.NAME, ARG_TYPE.ANY],
    )
    expect(hint).toBe('next: <name>')
  })

  it('expects second arg when cursor is on third word', () => {
    const tokens = linetokens('# give foo bar')
    const cmdidx = tokens.findIndex(
      (t) => t.tokenTypeIdx === lexer.command.tokenTypeIdx,
    )
    const barstart = tokens.find((t) => t.image === 'bar')?.startColumn ?? 1
    const col = barstart - 1
    const active = activetokenidxforcolumn(tokens, col)
    const cursor = col + 1
    const hint = computecommandnexthint(
      tokens,
      cmdidx,
      active,
      cursor,
      [ARG_TYPE.NAME, ARG_TYPE.ANY],
    )
    expect(hint).toBe('next: <any>')
  })
})
