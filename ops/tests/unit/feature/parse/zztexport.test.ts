import { zztencodeworld } from 'zss/feature/parse/zztencode'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import { iszztworldbytes } from 'zss/feature/parse/zztmagic'

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

describe('zztexport', () => {
  it('writes a buffer recognized as ZZT world with expected header fields', () => {
    const b = minimalboard('Title')
    const bytes = zztencodeworld('MYWORLD', 0, [b])
    expect(iszztworldbytes(bytes)).toBe(true)
    expect(bytes.length).toBeGreaterThan(512)
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    expect(dv.getInt16(0, true)).toBe(-1)
    expect(dv.getInt16(2, true)).toBe(0)
    expect(dv.getInt16(17, true)).toBe(0)
    const namelen = dv.getUint8(29)
    expect(namelen).toBe(7)
    let w = ''
    for (let i = 0; i < namelen; ++i) {
      w += String.fromCharCode(dv.getUint8(30 + i))
    }
    expect(w).toBe('MYWORLD')
  })
})
