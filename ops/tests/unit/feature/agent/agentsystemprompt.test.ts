import { readagentsystemprompt } from 'zss/feature/agent/agentsystemprompt'
import { BOARD_HEIGHT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'

describe('agentsystemprompt', () => {
  it('includes board dimensions, kinds, paint tools, and examples', () => {
    const prompt = readagentsystemprompt()
    expect(prompt).toContain(`${BOARD_WIDTH} columns`)
    expect(prompt).toContain(`${BOARD_HEIGHT} rows`)
    expect(prompt).toContain(`${BOARD_SIZE} cells`)
    expect(prompt).toContain('fill_terrain')
    expect(prompt).toContain('replace_kind')
    expect(prompt).toContain('summarize_board')
    expect(prompt).toContain('read_player_state')
    expect(prompt).toContain('mode="kinds"')
    expect(prompt).toContain('## Examples')
    expect(prompt).toContain('Do not invent kinds')
    expect(prompt).toContain('apply_zedcafe_batch')
  })
})
