import { readagentsystemprompt } from 'zss/feature/agent/agentsystemprompt'
import { BOARD_HEIGHT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'

describe('agentsystemprompt', () => {
  it('includes board dimensions, path/schema, and kind-from-codepage guidance', () => {
    const prompt = readagentsystemprompt()
    expect(prompt).toContain(`${BOARD_WIDTH} columns`)
    expect(prompt).toContain(`${BOARD_HEIGHT} rows`)
    expect(prompt).toContain(`${BOARD_SIZE} cells`)
    expect(prompt).toContain('board/terrain.json')
    expect(prompt).toContain('stats.json')
    expect(prompt).toContain('_gadget')
    expect(prompt).toContain('apply_zedcafe_batch')
    expect(prompt).toContain('Never ask the user for export paths')
    expect(prompt).toContain('Element kinds')
    expect(prompt).toContain('type is "object" or "terrain"')
    expect(prompt).toContain('object/element.json')
    expect(prompt).toContain('terrain/element.json')
    expect(prompt).toContain('Do not invent kind names')
  })
})
