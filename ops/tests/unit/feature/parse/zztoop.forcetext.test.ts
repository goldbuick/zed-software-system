import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import {
  type CodeNode,
  NODE,
} from 'zss/feature/lang/backend/typescript/visitor'
import { ooptuzz } from 'zss/feature/parse/ooptuzz'
import { forcetextquote, zztoop } from 'zss/feature/parse/zztoop'

function collectnodetype(root: CodeNode, type: NODE): CodeNode[] {
  const out: CodeNode[] = []
  function walk(node: CodeNode) {
    if (node.type === type) {
      out.push(node)
    }
    const keys = Object.keys(node).filter((k) => k !== 'parent' && k !== 'range')
    for (const k of keys) {
      const v = (node as unknown as Record<string, unknown>)[k]
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item && typeof item === 'object' && 'type' in item) {
            walk(item as CodeNode)
          }
        }
      } else if (v && typeof v === 'object' && 'type' in v) {
        walk(v as CodeNode)
      }
    }
  }
  walk(root)
  return out
}

describe('forcetextquote', () => {
  it('quotes indented ASCII art that looks structural', () => {
    expect(forcetextquote('            /\\/\\/\\/\\/\\')).toBe(
      '"            /\\/\\/\\/\\/\\',
    )
    expect(forcetextquote('         ######')).toBe('"         ######')
    expect(forcetextquote('       ::::::::::')).toBe('"       ::::::::::')
  })

  it('quotes indented #go (RoZZT leading-space text)', () => {
    expect(forcetextquote('  #go n')).toBe('"  #go n')
  })

  it('leaves column-0 commands and moves untouched', () => {
    expect(forcetextquote('/i')).toBe('/i')
    expect(forcetextquote('#play c c c')).toBe('#play c c c')
    expect(forcetextquote('#die')).toBe('#die')
    expect(forcetextquote('#end')).toBe('#end')
    expect(forcetextquote(':touch')).toBe(':touch')
  })

  it('quotes column-0 # art with no command letter', () => {
    expect(forcetextquote('######')).toBe('"######')
  })

  it('is idempotent when already quoted', () => {
    expect(forcetextquote('"            /\\/\\')).toBe('"            /\\/\\')
  })

  it('leaves indented prose and $CENTER alone', () => {
    expect(forcetextquote(' Hello')).toBe(' Hello')
    expect(forcetextquote('$CENTERTitle')).toBe('$CENTERTitle')
  })
})

describe('zztoop force-quote import', () => {
  it('quotes pokemon-style art and leaves column-0 /i #play', () => {
    const src = [
      'Welcome to:',
      '$Pok$130mon',
      '            /\\/\\/\\/\\/\\',
      '/i',
      ' I have been studying',
      '#play c c c',
      '         ######',
      '#die',
      '#end',
      '',
    ].join('\n')
    const out = zztoop(src)
    const lines = out.split('\n')
    expect(lines[0]).toBe('Welcome to:')
    expect(lines[1]).toBe('$CENTERPok$130mon')
    expect(lines[2]).toBe('"            /\\/\\/\\/\\/\\')
    expect(lines[3]).toBe('/i')
    expect(lines[5]).toBe('#play c c c')
    expect(lines[6]).toBe('"         ######')
    expect(lines[7]).toBe('#die')
    expect(lines[8]).toBe('#end')
  })

  it('compiles imported art as TEXT preserving leading spaces', () => {
    const art = '            /\\/\\/\\/\\/\\'
    const hashes = '         ######'
    const imported = zztoop([art, hashes, '#end', ''].join('\n'))
    const r = compileast(imported)
    expect(r.errors?.length ?? 0).toBe(0)
    expect(r.ast).toBeDefined()
    const texts = collectnodetype(r.ast!, NODE.TEXT)
      .map((n) => ('value' in n ? String(n.value) : ''))
      .filter((v) => v.length > 0)
    expect(texts).toContain(art)
    expect(texts).toContain(hashes)
    expect(texts.every((v) => !v.includes('"'))).toBe(true)
  })
})

describe('ooptuzz force-quote reverse', () => {
  it('strips import-inserted quotes and keeps leading spaces', () => {
    const art = '            /\\/\\/\\/\\/\\'
    const quoted = zztoop(art)
    expect(quoted).toBe(`"${art}`)
    expect(ooptuzz(quoted)).toBe(art)
  })

  it('still maps #play to #fgplay', () => {
    expect(ooptuzz('#play c c')).toBe('#fgplay c c')
  })
})
