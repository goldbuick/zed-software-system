import {
  compactagentreadresult,
  fillterrainrect,
  replaceterrainkind,
  summarizeterrainboard,
  truncateagenttoolhistorycontent,
} from 'zss/feature/agent/agentreadcompact'
import { formatagentthinkingstatus } from 'zss/feature/agent/agentfeedback'
import { BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'

describe('agentreadcompact', () => {
  it('summarizes terrain instead of returning full array', () => {
    const terrain = Array.from({ length: BOARD_SIZE }, (_, i) =>
      i < 10 ? { kind: 'solid' } : {},
    )
    const result = compactagentreadresult(
      'demo-b1/title-p1/board/terrain.json',
      JSON.stringify(terrain),
      terrain,
      100,
    )
    expect(result.length).toBe(BOARD_SIZE)
    expect(result.kinds).toEqual({ solid: 10, '(empty)': BOARD_SIZE - 10 })
    expect(Array.isArray(result.sample)).toBe(true)
    expect((result.sample as unknown[]).length).toBe(60)
    expect(result.json).toBeUndefined()
    expect(String(result.note)).toMatch(/fill_terrain/)
  })

  it('truncates long page code in stats', () => {
    const code = 'x'.repeat(3000)
    const result = compactagentreadresult(
      'demo-b1/obj-p1/stats.json',
      '{}',
      { id: 'p1', code, type: 'object', name: 'lion' },
      50,
    )
    const json = result.json as { code: string; truncated?: boolean }
    expect(json.truncated).toBe(true)
    expect(json.code.length).toBeLessThan(2100)
  })

  it('fills rect and replaces kinds', () => {
    const empty = Array.from({ length: BOARD_SIZE }, () => ({}))
    const filled = fillterrainrect(empty, 'grass', {
      x: 0,
      y: 0,
      w: 2,
      h: 1,
    })
    expect(filled[0]).toEqual({ kind: 'grass' })
    expect(filled[1]).toEqual({ kind: 'grass' })
    expect(filled[2]).toEqual({})
    const { terrain, replaced } = replaceterrainkind(filled, 'grass', 'water')
    expect(replaced).toBe(2)
    expect(terrain[0]).toEqual({ kind: 'water' })
  })

  it('summarizes board ascii with legend', () => {
    const terrain = Array.from({ length: BOARD_SIZE }, () => ({}))
    terrain[0] = { kind: 'solid' }
    terrain[BOARD_WIDTH] = { kind: 'water' }
    const summary = summarizeterrainboard(terrain)
    expect(summary.kinds.solid).toBe(1)
    expect(summary.ascii.split('\n').length).toBe(25)
    expect(summary.legend['#']).toBe('solid')
  })

  it('truncates tool history content', () => {
    const big = { data: 'y'.repeat(8000) }
    const out = truncateagenttoolhistorycontent(big, 100)
    expect(out.length).toBeLessThan(8000)
    expect(JSON.parse(out).truncated).toBe(true)
  })
})

describe('agentfeedback thinking format', () => {
  it('formats elapsed thinking status', () => {
    expect(formatagentthinkingstatus(0)).toBe('agent thinking…')
    expect(formatagentthinkingstatus(5000)).toBe('agent thinking… 5s')
  })
})
