import { isszztworldbytes, iszztworldbytes } from 'zss/feature/parse/zztmagic'

describe('zzt magic bytes', () => {
  it('detects ZZT world type -1', () => {
    const u8 = new Uint8Array(4)
    u8[0] = 0xff
    u8[1] = 0xff
    expect(iszztworldbytes(u8)).toBe(true)
    expect(isszztworldbytes(u8)).toBe(false)
  })

  it('detects Super ZZT world type -2', () => {
    const u8 = new Uint8Array(4)
    u8[0] = 0xfe
    u8[1] = 0xff
    expect(isszztworldbytes(u8)).toBe(true)
    expect(iszztworldbytes(u8)).toBe(false)
  })

  it('rejects short buffer', () => {
    expect(iszztworldbytes(new Uint8Array(0))).toBe(false)
  })
})
