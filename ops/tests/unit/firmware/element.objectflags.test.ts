import type { CHIP } from 'zss/chip'
import { ELEMENT_FIRMWARE } from 'zss/firmware/element'
import { memoryreadflags } from 'zss/memory/flags'
import { READ_CONTEXT } from 'zss/words/reader'

jest.mock('zss/device/api', () => ({
  ...jest.requireActual('zss/device/api'),
  apitoast: jest.fn(),
  registerstickyuser: jest.fn(),
  registerstickyvoice: jest.fn(),
  vmlogout: jest.fn(),
}))

jest.mock('zss/memory/flags', () => ({
  ...jest.requireActual('zss/memory/flags'),
  memoryreadflags: jest.fn(() => ({})),
}))

const chip = {
  command: jest.fn(() => 0),
} as unknown as CHIP

describe('element custom vars for non-player objects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(memoryreadflags).mockReturnValue({})
    READ_CONTEXT.board = { id: 'board1', objects: {}, terrain: [] } as never
    READ_CONTEXT.elementfocus = 'pid_focus'
    READ_CONTEXT.timestamp = 1
  })

  it('stores follower/leader on the object element, not player flags', () => {
    const head = { id: 'oid_head', x: 1, y: 1 } as never
    READ_CONTEXT.element = head
    READ_CONTEXT.elementid = 'oid_head'
    READ_CONTEXT.elementisplayer = false

    const [setwok, setval] = ELEMENT_FIRMWARE.set!(
      chip,
      'follower',
      'oid_seg',
    )
    expect(setwok).toBe(true)
    expect(setval).toBe('oid_seg')
    expect((head as { follower?: string }).follower).toBe('oid_seg')
    expect(memoryreadflags).not.toHaveBeenCalled()

    const [getok, getval] = ELEMENT_FIRMWARE.get!(chip, 'follower')
    expect(getok).toBe(true)
    expect(getval).toBe('oid_seg')
  })

  it('keeps separate custom vars per object', () => {
    const a = { id: 'oid_a', x: 0, y: 0 } as never
    const b = { id: 'oid_b', x: 1, y: 0 } as never
    READ_CONTEXT.elementisplayer = false

    READ_CONTEXT.element = a
    READ_CONTEXT.elementid = 'oid_a'
    ELEMENT_FIRMWARE.set!(chip, 'leader', 'oid_head_a')

    READ_CONTEXT.element = b
    READ_CONTEXT.elementid = 'oid_b'
    ELEMENT_FIRMWARE.set!(chip, 'leader', 'oid_head_b')

    READ_CONTEXT.element = a
    expect(ELEMENT_FIRMWARE.get!(chip, 'leader')[1]).toBe('oid_head_a')
    READ_CONTEXT.element = b
    expect(ELEMENT_FIRMWARE.get!(chip, 'leader')[1]).toBe('oid_head_b')
  })

  it('still writes unknown names to player flags for player chips', () => {
    const flags: Record<string, unknown> = {}
    jest.mocked(memoryreadflags).mockReturnValue(flags as never)
    READ_CONTEXT.element = { id: 'pid_1', x: 2, y: 2 } as never
    READ_CONTEXT.elementid = 'pid_1'
    READ_CONTEXT.elementisplayer = true
    READ_CONTEXT.elementfocus = 'pid_1'

    const [ok] = ELEMENT_FIRMWARE.set!(chip, 'hint', 1)
    expect(ok).toBe(true)
    expect(flags.hint).toBe(1)
  })
})
