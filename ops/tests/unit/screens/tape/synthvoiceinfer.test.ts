import { tokenize } from 'zss/feature/lang/lexer'
import { AUDIO_FIRMWARE } from 'zss/firmware/audio'
import type { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import { getautocomplete } from 'zss/screens/tape/autocomplete'
import { splitcoderows, type EDITOR_CODE_ROW } from 'zss/screens/tape/common'

const words = {
  langcommands: {},
  clicommands: {},
  loadercommands: {},
  runtimecommands: {},
  flags: [],
  statsboard: [],
  statshelper: [],
  statssender: [],
  statsinteraction: [],
  statsboolean: [],
  statsconfig: [],
  objects: [],
  terrains: [],
  boards: [],
  palettes: [],
  charsets: [],
  loaders: [],
  categories: [],
  colors: [],
  dirs: [],
  dirmods: [],
  exprs: [],
  roles: [],
  permissionconfigs: [],
  players: [],
  labels: [],
  commandargmeta: {
    synth: AUDIO_FIRMWARE.getcommandargmeta('synth') ?? {},
    synth1: AUDIO_FIRMWARE.getcommandargmeta('synth1') ?? {},
    synth5: AUDIO_FIRMWARE.getcommandargmeta('synth5') ?? {},
  },
} satisfies GADGET_ZSS_WORDS

function rowsforcode(source: string): EDITOR_CODE_ROW[] {
  const fullcode = source.endsWith('\n') ? source : `${source}\n`
  const rows = splitcoderows(fullcode)
  const result = tokenize(fullcode)
  expect(result.errors.length).toBe(0)
  for (let i = 0; i < result.tokens.length; ++i) {
    const token = result.tokens[i]
    const row = rows[(token.startLine ?? 1) - 1]
    if (!row) {
      continue
    }
    row.tokens = row.tokens ?? []
    row.tokens.push(token)
  }
  return rows
}

function suggestions(source: string, prefix: string): string[] {
  const rows = rowsforcode(source)
  let cursorrow = -1
  for (let i = rows.length - 1; i >= 0; --i) {
    if (rows[i].code.includes(prefix)) {
      cursorrow = i
      break
    }
  }
  const row = rows[cursorrow]
  const at = row.code.indexOf(prefix)
  const cursor = row.start + at + prefix.length
  const ac = getautocomplete(
    row,
    cursor,
    words,
    undefined,
    undefined,
    'editor',
    rows,
    cursorrow,
  )
  return ac.suggestions.map((item) => item.word)
}

describe('synth voice inference autocomplete', () => {
  it('offers fmsquare keys after #synth fmsquare', () => {
    const wordsuggestions = suggestions('#synth fmsquare\n#synth har', 'har')
    expect(wordsuggestions).toContain('harmonicity')
    expect(wordsuggestions).not.toContain('hammer')
  })

  it('offers string keys after #synth string', () => {
    expect(suggestions('#synth string\n#synth det', 'det')).toContain('detune')
    expect(suggestions('#synth string\n#synth mod', 'mod')).not.toContain(
      'modtype',
    )
  })

  it('lets #synth1 override only that voice', () => {
    const source = '#synth fmsquare\n#synth1 piano\n'
    expect(suggestions(`${source}#synth har`, 'har')).toContain('harmonicity')
    expect(suggestions(`${source}#synth har`, 'har')).not.toContain('hammer')
    expect(suggestions(`${source}#synth1 ham`, 'ham')).toContain('hammer')
    expect(suggestions(`${source}#synth1 har`, 'har')).not.toContain(
      'harmonicity',
    )
  })

  it('does not inherit the play voice on #synth5', () => {
    expect(suggestions('#synth fmsquare\n#synth5 ham', 'ham')).toContain(
      'hammer',
    )
    expect(suggestions('#synth5 fmsquare\n#synth5 ham', 'ham')).not.toContain(
      'hammer',
    )
    expect(suggestions('#synth5 fmsquare\n#synth5 har', 'har')).toContain(
      'harmonicity',
    )
  })

  it('clears the inferred voice after #synth restart', () => {
    const source = '#synth fmsquare\n#synth restart\n#synth ham'
    expect(suggestions(source, 'ham')).toContain('hammer')
  })
})
