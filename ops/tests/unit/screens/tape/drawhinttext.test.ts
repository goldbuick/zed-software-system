import { COLOR } from 'zss/words/types'
import { createwritetextcontext } from 'zss/words/textformat'
import { drawhinttext } from 'zss/screens/tape/autocomplete'

describe('drawhinttext', () => {
  it('applies $COLOR codes instead of drawing them as literal text', () => {
    const width = 80
    const height = 3
    const context = createwritetextcontext(width, height, COLOR.GREEN, COLOR.BLACK)
    context.char = Array(width * height).fill(' ')
    context.color = Array(width * height).fill(COLOR.GREEN)
    context.bg = Array(width * height).fill(COLOR.BLACK)

    const hint = '$YELLOWelements that can walk'
    const written = drawhinttext(hint, 0, 1, width - 1, context)

    expect(written).toBe('elements that can walk'.length)
    const row = context.char.slice(width, width + written).join('')
    expect(row).toBe('elements that can walk')
    expect(row.includes('$')).toBe(false)
    expect(row.includes('YELLOW')).toBe(false)
    expect(context.color[width]).toBe(COLOR.YELLOW)
  })

  it('uses default fg when hint has no format codes', () => {
    const width = 40
    const height = 2
    const context = createwritetextcontext(width, height, COLOR.WHITE, COLOR.BLACK)
    context.char = Array(width * height).fill(' ')
    context.color = Array(width * height).fill(COLOR.WHITE)
    context.bg = Array(width * height).fill(COLOR.BLACK)

    drawhinttext('plain hint', 2, 0, width - 1, context)
    expect(context.char[2]).toBe('p')
    expect(context.color[2]).toBe(COLOR.GREEN)
  })
})
