import { buildagentsessioncontextfromfiles } from 'zss/feature/agent/agentcontext'

const encoder = new TextEncoder()

function file(path: string, value: unknown) {
  return {
    path,
    data: Array.from(encoder.encode(`${JSON.stringify(value)}\n`)),
  }
}

describe('agentcontext', () => {
  it('builds kind catalog and player board from export files', () => {
    const files = [
      file('stats.json', {
        bookCount: 1,
        books: [{ id: 'b1', name: 'demo', pageCount: 2 }],
      }),
      file('demo-b1/stats.json', {
        id: 'b1',
        name: 'demo',
        pages: [
          { id: 'p1', type: 'board', name: 'title' },
          { id: 't1', type: 'terrain', name: 'solid' },
          { id: 'o1', type: 'object', name: 'lion' },
        ],
      }),
      file('demo-b1/flags/pid_1.json', { board: 'p1' }),
      file('demo-b1/title-p1/board/objects/pid_1.json', { x: 3, y: 4 }),
    ]
    const ctx = buildagentsessioncontextfromfiles('pid_1', files)
    expect(ctx.bookDir).toBe('demo-b1')
    expect(ctx.boardPageDir).toBe('demo-b1/title-p1')
    expect(ctx.boardTerrainPath).toBe('demo-b1/title-p1/board/terrain.json')
    expect(ctx.playerX).toBe(3)
    expect(ctx.playerY).toBe(4)
    expect(ctx.kinds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'terrain', name: 'solid' }),
        expect.objectContaining({ type: 'object', name: 'lion' }),
      ]),
    )
    expect(ctx.promptblock).toContain('bookDir: demo-b1')
    expect(ctx.promptblock).toContain('player xy: 3,4')
  })
})
