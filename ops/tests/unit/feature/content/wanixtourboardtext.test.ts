import { readFileSync } from 'node:fs'
import path from 'node:path'

const BOARD_WIDTH = 60
const PAGES_DIR = path.join(
  process.cwd(),
  'ops/fixtures/content/templates/wanixtour/pages',
)

function readboardtextrows(filename: string): number[] {
  const raw = readFileSync(path.join(PAGES_DIR, filename), 'utf8')
  const board = JSON.parse(raw) as {
    board: { terrain: { kind?: string; char?: number }[] }
  }
  const rows: number[] = []
  for (let i = 0; i < board.board.terrain.length; i++) {
    const tile = board.board.terrain[i]
    if (
      tile.kind !== 'fake' ||
      tile.char === undefined ||
      (tile.color !== 11 && tile.color !== 14)
    ) {
      continue
    }
    rows.push(Math.floor(i / BOARD_WIDTH))
  }
  return rows
}

describe('wanixtour boardtext bottom align', () => {
  it('places wanixdrop copy in the lower board half', () => {
    const rows = readboardtextrows('wanixdrop.board.json')
    expect(rows.length).toBeGreaterThan(0)
    expect(Math.min(...rows)).toBeGreaterThanOrEqual(11)
    expect(Math.max(...rows)).toBeLessThanOrEqual(21)
  })

  it('anchors outro copy at the same bottom band', () => {
    const rows = readboardtextrows('outro.board.json')
    expect(Math.max(...rows)).toBe(21)
  })
})
