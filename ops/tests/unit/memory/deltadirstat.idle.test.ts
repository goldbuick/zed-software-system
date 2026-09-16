import {
  DIR_EDIT_CARDINALS,
  memorycardinaldirfromdelta,
  memoryclampdireditcardinal,
} from 'zss/memory/deltadirstat'
import { memorycreateboardelement } from 'zss/memory/boardelement'
import {
  memoryapplyelementstats,
  memoryreadcodepagestatsfromtext,
} from 'zss/memory/codepageoperations'

describe('dir edit idle', () => {
  it('DIR_EDIT_CARDINALS includes idle among the five choices', () => {
    expect([...DIR_EDIT_CARDINALS]).toEqual([
      'idle',
      'north',
      'south',
      'west',
      'east',
    ])
  })

  it('maps (0,0) delta to idle', () => {
    expect(memorycardinaldirfromdelta(0, 0)).toBe('idle')
  })

  it('clamps idle aliases', () => {
    expect(memoryclampdireditcardinal('idle')).toBe('idle')
    expect(memoryclampdireditcardinal('i')).toBe('idle')
    expect(memoryclampdireditcardinal('stop')).toBe('idle')
    expect(memoryclampdireditcardinal('nope')).toBe('idle')
  })

  it('@step idle zeros step axes', () => {
    const stats = memoryreadcodepagestatsfromtext(
      '@object mover\n@step idle\n',
    )
    const element = memorycreateboardelement()
    element.stepx = 1
    element.stepy = 1
    memoryapplyelementstats(stats, element)
    expect(element.stepx).toBe(0)
    expect(element.stepy).toBe(0)
  })
})
