import { memorycreateboardelement } from 'zss/memory/boardelement'
import {
  memoryapplyelementstats,
  memorycreatecodepage,
  memoryreadcodepagedata,
  memoryreadcodepagestatsfromtext,
} from 'zss/memory/codepageoperations'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

describe('memoryapplyelementstats @step / @shoot', () => {
  it('@step n sets step deltas north', () => {
    const stats = memoryreadcodepagestatsfromtext('@object mover\n@step n\n')
    expect(stats.step).toBe('n')
    const element = memorycreateboardelement({ kind: 'mover' })
    memoryapplyelementstats(stats, element)
    expect(element.stepx).toBe(0)
    expect(element.stepy).toBe(-1)
  })

  it('@step north sets step deltas', () => {
    const stats = memoryreadcodepagestatsfromtext(
      '@object mover\n@step north\n',
    )
    const element = memorycreateboardelement({ kind: 'mover' })
    memoryapplyelementstats(stats, element)
    expect(element.stepx).toBe(0)
    expect(element.stepy).toBe(-1)
  })

  it('@shoot e sets shoot deltas east', () => {
    const stats = memoryreadcodepagestatsfromtext('@object gun\n@shoot e\n')
    expect(stats.shoot).toBe('e')
    const element = memorycreateboardelement({ kind: 'gun' })
    memoryapplyelementstats(stats, element)
    expect(element.shootx).toBe(1)
    expect(element.shooty).toBe(0)
  })

  it('codepage object kinddata carries step from @step', () => {
    const page = memorycreatecodepage('@object pusher\n@step south\n', {})
    const object = memoryreadcodepagedata<CODE_PAGE_TYPE.OBJECT>(
      page,
      CODE_PAGE_TYPE.OBJECT,
    )
    expect(object?.stepx).toBe(0)
    expect(object?.stepy).toBe(1)
  })

  it('@step dir;step parses as dir hyperlink array', () => {
    const stats = memoryreadcodepagestatsfromtext(
      '@object mover\n@step dir;step\n',
    )
    expect(stats.step).toEqual(['dir', 'step'])
  })
})
