import { LOADER_FIRMWARE } from 'zss/firmware/loader'
import { memoryloadercontent, memoryloaderformat } from 'zss/memory/loader'

jest.mock('zss/memory/loader', () => ({
  memoryloadercontent: jest.fn(),
  memoryloaderformat: jest.fn(),
}))

const mockcontent = memoryloadercontent as jest.Mock
const mockformat = memoryloaderformat as jest.Mock

describe('LOADER_FIRMWARE eof', () => {
  const chip = { id: () => 'loader1' }

  it('eof is 0 before end and 1 at cursor = lines', () => {
    mockformat.mockReturnValue('text')
    mockcontent.mockReturnValue({
      filename: 'f',
      cursor: 0,
      lines: ['a', 'b'],
    })
    expect(LOADER_FIRMWARE.get?.(chip as never, 'eof')).toEqual([true, 0])
    mockcontent.mockReturnValue({
      filename: 'f',
      cursor: 2,
      lines: ['a', 'b'],
    })
    expect(LOADER_FIRMWARE.get?.(chip as never, 'eof')).toEqual([true, 1])
  })

  it('binary eof follows cursor vs bytes length', () => {
    mockformat.mockReturnValue('binary')
    mockcontent.mockReturnValue({
      filename: 'f',
      cursor: 0,
      bytes: new Uint8Array([1, 2, 3]),
    })
    expect(LOADER_FIRMWARE.get?.(chip as never, 'eof')).toEqual([true, 0])
    mockcontent.mockReturnValue({
      filename: 'f',
      cursor: 3,
      bytes: new Uint8Array([1, 2, 3]),
    })
    expect(LOADER_FIRMWARE.get?.(chip as never, 'eof')).toEqual([true, 1])
  })
})
