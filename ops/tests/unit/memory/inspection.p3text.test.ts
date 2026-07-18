/**
 * @p3 text on an object codepage must become an inspect !p3 text; hyperlink.
 */
import { zsszedlinkline } from 'zss/feature/zsstextui'
import { isarray, isstring } from 'zss/mapping/types'
import { memoryreadcodepagestatsfromtext } from 'zss/memory/codepageoperations'
import type { WORD } from 'zss/words/types'
import { objectKeys } from 'ts-extras'

function inspectstatlines(code: string): string[] {
  const stats = memoryreadcodepagestatsfromtext(code)
  const lines: string[] = []
  const targets = objectKeys(stats)
  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]
    switch (target) {
      case 'type':
      case 'name':
      case 'char':
      case 'cycle':
      case 'color':
      case 'bg':
      case 'group':
      case 'collision':
      case 'pushable':
      case 'breakable':
        break
      default:
        if (isarray(stats[target])) {
          const [type, label, ...args] = stats[target] as WORD[]
          if (isstring(type)) {
            const linklabel =
              isstring(label) && label.length > 0 ? label : target
            const words: WORD[] = [target, type, ...args]
            lines.push(
              zsszedlinkline(
                words
                  .map((w) => `${w ?? ''}`)
                  .join(' '),
                linklabel,
              ),
            )
          }
        }
        break
    }
  }
  return lines
}

describe('inspect @p3 text hyperlink', () => {
  it('parses @p3 text into stats.p3 = [text, label]', () => {
    const stats = memoryreadcodepagestatsfromtext(
      ['@object passage', '@p3 text', ''].join('\n'),
    )
    expect(stats.p3).toEqual(['text', ''])
  })

  it('emits !p3 text;p3 for inspect (editable text hyperlink)', () => {
    const lines = inspectstatlines(
      ['@object passage', '@char 240', '@p3 text', ''].join('\n'),
    )
    expect(lines).toContain('!p3 text;p3')
  })

  it('uses semicolon label when provided', () => {
    const lines = inspectstatlines(
      ['@object passage', '@p3 text;goto board', ''].join('\n'),
    )
    expect(lines).toContain('!p3 text;goto board')
  })
})
