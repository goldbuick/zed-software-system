import type { CHIP } from 'zss/chip'
import { apierror } from 'zss/device/api'
import { RUNTIME_FIRMWARE, cleartickreadcontextall } from 'zss/firmware/runtime'
import { gadgetcheckqueue, gadgetstate } from 'zss/gadget/data/api'
import { ispresent } from 'zss/mapping/types'
import { READ_CONTEXT } from 'zss/words/reader'

jest.mock('zss/device/api', () => ({
  ...jest.requireActual('zss/device/api'),
  apierror: jest.fn(),
  apitoast: jest.fn(),
  gadgetclientbonk: jest.fn(),
  gadgetclientzap: jest.fn(),
  gadgetclientfadeout: jest.fn(),
  gadgetclientfadein: jest.fn(),
  vmrefscroll: jest.fn(),
}))

jest.mock('zss/gadget/data/api', () => ({
  ...jest.requireActual('zss/gadget/data/api'),
  gadgetcheckqueue: jest.fn(() => []),
}))

const chip = {
  scrolllock: jest.fn(),
} as unknown as CHIP

describe('runtime sidebar vs scroll aftertick', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cleartickreadcontextall()
    READ_CONTEXT.timestamp = 42
    READ_CONTEXT.board = {
      id: 'board1',
      objects: {},
    } as typeof READ_CONTEXT.board
    READ_CONTEXT.element = {
      id: 'pid_player1',
      name: 'player',
    } as typeof READ_CONTEXT.element
    READ_CONTEXT.elementid = 'pid_player1'
    READ_CONTEXT.elementfocus = 'pid_player1'
    READ_CONTEXT.elementisplayer = true
    if (ispresent(READ_CONTEXT.board)) {
      READ_CONTEXT.board.objects.pid_player1 = READ_CONTEXT.element
    }
  })

  it('routes multi-line player queue to gadget.sidebar', () => {
    jest
      .mocked(gadgetcheckqueue)
      .mockReturnValueOnce(['health 100', 'ammo 5'])
    RUNTIME_FIRMWARE.everytick(chip)
    RUNTIME_FIRMWARE.aftertick(chip)
    const shared = gadgetstate('pid_player1')
    expect(shared.sidebar?.length).toBeGreaterThan(0)
    expect(shared.scroll?.length ?? 0).toBe(0)
    expect(chip.scrolllock).not.toHaveBeenCalled()
  })

  it('routes multi-line non-player queue to gadget.scroll', () => {
    READ_CONTEXT.element = {
      id: 'sid_sign1',
      name: 'sign',
    } as typeof READ_CONTEXT.element
    READ_CONTEXT.elementid = 'sid_sign1'
    READ_CONTEXT.elementisplayer = false
    READ_CONTEXT.elementfocus = 'pid_player1'
    jest.mocked(gadgetcheckqueue).mockReturnValueOnce(['line one', 'line two'])
    RUNTIME_FIRMWARE.everytick(chip)
    RUNTIME_FIRMWARE.aftertick(chip)
    const shared = gadgetstate('pid_player1')
    expect(shared.scrollname).toBe('sign')
    expect(shared.scroll?.length).toBeGreaterThan(0)
    expect(chip.scrolllock).toHaveBeenCalledWith('pid_player1')
  })

  it('survives nested runtime tick (reentrant memorytickobject)', () => {
    jest
      .mocked(gadgetcheckqueue)
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['health 100', 'ammo 5'])
    RUNTIME_FIRMWARE.everytick(chip)
    READ_CONTEXT.elementid = 'sid_bullet1'
    READ_CONTEXT.elementisplayer = false
    RUNTIME_FIRMWARE.everytick(chip)
    RUNTIME_FIRMWARE.aftertick(chip)
    READ_CONTEXT.elementid = 'pid_player1'
    READ_CONTEXT.elementisplayer = true
    RUNTIME_FIRMWARE.aftertick(chip)
    const shared = gadgetstate('pid_player1')
    expect(shared.sidebar?.length).toBeGreaterThan(0)
  })

  it('fails loud when aftertick runs without everytick bind', () => {
    jest.mocked(gadgetcheckqueue).mockReturnValueOnce(['a', 'b'])
    expect(() => RUNTIME_FIRMWARE.aftertick(chip)).toThrow(
      'readtickreadcontext without everytick bind',
    )
    expect(apierror).toHaveBeenCalled()
  })

  it('apierrors when bound context disagrees with focus board object', () => {
    READ_CONTEXT.elementisplayer = false
    jest.mocked(gadgetcheckqueue).mockReturnValueOnce(['health 100', 'ammo 5'])
    RUNTIME_FIRMWARE.everytick(chip)
    RUNTIME_FIRMWARE.aftertick(chip)
    expect(apierror).toHaveBeenCalledWith(
      expect.anything(),
      'pid_player1',
      'runtime',
      'aftertick: elementisplayer false but element is focus board object',
    )
  })
})