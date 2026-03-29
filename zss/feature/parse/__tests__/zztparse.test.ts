import { zztparseworld } from 'zss/feature/parse/zzt'
import { zztencodeworld } from 'zss/feature/parse/zztencode'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'

const ZZT_WORLD_HEADER_BYTES = 512

function blankelements(): { type: number; color: number }[] {
  return Array.from({ length: 1500 }, () => ({ type: 0, color: 0 }))
}

function minimalboard(name: string): ZZT_BOARD {
  return {
    boardname: name,
    elements: blankelements(),
    stats: [{ x: 0, y: 0, code: '' }],
    maxplayershots: 255,
    isdark: 0,
    exitnorth: 0,
    exitsouth: 0,
    exitwest: 0,
    exiteast: 0,
    restartonzap: 0,
    messagelength: 0,
    message: '',
    timelimit: 0,
  }
}

describe('zztparseworld', () => {
  it('accepts under-declared board size (copy protection style)', () => {
    const board = minimalboard('Title')
    const good = zztencodeworld('MYWORLD', 0, [board])
    const goodparse = zztparseworld(good)
    expect(goodparse.ok).toBe(true)
    if (!goodparse.ok) {
      return
    }

    const patched = new Uint8Array(good)
    const dv = new DataView(
      patched.buffer,
      patched.byteOffset,
      patched.byteLength,
    )
    const boardoff = ZZT_WORLD_HEADER_BYTES
    const truesize = dv.getInt16(boardoff, true)
    expect(truesize).toBeGreaterThan(100)
    dv.setInt16(boardoff, truesize - 200, true)

    const badheader = zztparseworld(patched)
    expect(badheader.ok).toBe(true)
    if (!badheader.ok) {
      return
    }
    expect(badheader.worldname).toBe(goodparse.worldname)
    expect(badheader.playerboard).toBe(goodparse.playerboard)
    expect(badheader.boards.length).toBe(1)
    expect(badheader.boards[0].boardname).toBe(goodparse.boards[0].boardname)
  })
})
