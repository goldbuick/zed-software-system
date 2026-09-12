import { memorycreateboardelement } from 'zss/memory/boardelement'
import {
  memoryapplyelementstats,
  memorycreatecodepage,
  memoryreadcodepagedata,
  memoryreadcodepagestatsfromtext,
} from 'zss/memory/codepageoperations'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

describe('memoryapplyelementstats @light', () => {
  it('@light radius alone sets lightsteps and circle axes', () => {
    const stats = memoryreadcodepagestatsfromtext('@object torch\n@light 4\n')
    const element = memorycreateboardelement({ kind: 'torch' })
    memoryapplyelementstats(stats, element)
    expect(element.lightsteps).toBe(4)
    expect(element.lightx).toBe(0)
    expect(element.lighty).toBe(0)
  })

  it('@light radius dir sets cone deltas', () => {
    const stats = memoryreadcodepagestatsfromtext('@object beam\n@light 6 n\n')
    expect(stats.light).toBe('6 n')
    const element = memorycreateboardelement({ kind: 'beam' })
    memoryapplyelementstats(stats, element)
    expect(element.lightsteps).toBe(6)
    expect(element.lightx).toBe(0)
    expect(element.lighty).toBe(-1)
  })

  it('codepage object kinddata carries lightsteps from @light', () => {
    const page = memorycreatecodepage('@object lantern\n@light 5\n', {})
    const object = memoryreadcodepagedata<CODE_PAGE_TYPE.OBJECT>(
      page,
      CODE_PAGE_TYPE.OBJECT,
    )
    expect(object?.lightsteps).toBe(5)
  })
})
