import { memoryreadobjectatpt } from 'zss/memory/boardaccess'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorymoveboardobject } from 'zss/memory/boardmovement'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import { BOARD } from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'

function makeplayer(board: BOARD, x: number, y: number, id: string) {
  const player = memorycreateboardobjectfromkind(board, { x, y }, 'player', id)
  expect(player).toBeDefined()
  player!.kind = 'player'
  return player!
}

describe('player occupancy at point', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('keeps standing player when another player walks on then off', () => {
    memoryresetbooks([
      memorycreatebook([memorycreatecodepage('@player\n', {})]),
    ])
    const board = memorycreateboard()
    memoryensureboardready(board)

    const standing = makeplayer(board, 44, 3, 'pid_standing')
    const walker = makeplayer(board, 45, 3, 'pid_walker')
    expect(memoryreadobjectatpt(board, { x: 44, y: 3 })?.id).toBe(standing.id)
    expect(memoryreadobjectatpt(board, { x: 45, y: 3 })?.id).toBe(walker.id)

    expect(
      memorymoveboardobject(board, walker, { x: 44, y: 3 }),
    ).toBeUndefined()
    expect(memoryreadobjectatpt(board, { x: 44, y: 3 })?.id).toBe(standing.id)
    expect(memoryreadobjectatpt(board, { x: 45, y: 3 })).toBeUndefined()

    expect(
      memorymoveboardobject(board, walker, { x: 45, y: 3 }),
    ).toBeUndefined()
    expect(memoryreadobjectatpt(board, { x: 44, y: 3 })?.id).toBe(standing.id)
    expect(memoryreadobjectatpt(board, { x: 45, y: 3 })?.id).toBe(walker.id)

    const bullet = memorycreateboardobjectfromkind(
      board,
      { x: 44, y: 4 },
      'bullet',
      'sid_shot',
    )
    expect(bullet).toBeDefined()
    bullet!.collision = COLLISION.ISBULLET
    const blocked = memorymoveboardobject(board, bullet, { x: 44, y: 3 })
    expect(blocked?.id).toBe(standing.id)
  })
})
