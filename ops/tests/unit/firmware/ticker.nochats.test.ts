import type { CHIP } from 'zss/chip'
import { apichat, vmloader } from 'zss/device/api'
import { CLI_FIRMWARE } from 'zss/firmware/cli'
import { ELEMENT_FIRMWARE } from 'zss/firmware/element'
import { RUNTIME_FIRMWARE } from 'zss/firmware/runtime'
import { gadgetcheckqueue } from 'zss/gadget/data/api'
import { memoryreadflags } from 'zss/memory/flags'
import { READ_CONTEXT } from 'zss/words/reader'

jest.mock('zss/device/api', () => ({
  ...jest.requireActual('zss/device/api'),
  apichat: jest.fn(() => true),
  vmloader: jest.fn(),
  apitoast: jest.fn(),
  gadgetclientbonk: jest.fn(),
  gadgetclientzap: jest.fn(),
  gadgetclientfadeout: jest.fn(),
  gadgetclientfadein: jest.fn(),
  vmmakeitscroll: jest.fn(),
  vmrefscroll: jest.fn(),
}))

jest.mock('zss/gadget/data/api', () => ({
  ...jest.requireActual('zss/gadget/data/api'),
  gadgetcheckqueue: jest.fn(() => []),
}))

jest.mock('zss/memory/flags', () => ({
  ...jest.requireActual('zss/memory/flags'),
  memoryreadflags: jest.fn(() => ({ user: 'alice' })),
}))

const chip = {} as CHIP

describe('ticker without chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    READ_CONTEXT.timestamp = 42
    READ_CONTEXT.board = { id: 'board1' } as typeof READ_CONTEXT.board
    READ_CONTEXT.element = {
      id: 'obj1',
      name: 'votetracker',
    } as typeof READ_CONTEXT.element
    READ_CONTEXT.elementid = 'obj1'
    READ_CONTEXT.elementisplayer = false
    READ_CONTEXT.elementfocus = 'player1'
  })

  it('#ticker sets tickertext and does not emit chat', () => {
    const handler = ELEMENT_FIRMWARE.getcommand('ticker')
    expect(handler).toBeDefined()
    handler!(chip, ['Choice', 'A', 'has', 1, 'vote(s)'])
    expect(READ_CONTEXT.element?.tickertext).toBe('Choice A has 1 vote(s)')
    expect(READ_CONTEXT.element?.tickertime).toBe(42)
    expect(apichat).not.toHaveBeenCalled()
  })

  it('runtime $ticker #text sets tickertext and does not emit chat', () => {
    const handler = RUNTIME_FIRMWARE.getcommand('text')
    expect(handler).toBeDefined()
    handler!(chip, ['$ticker', 'hello', 'bubble'])
    expect(READ_CONTEXT.element?.tickertext).toBe('hello bubble')
    expect(READ_CONTEXT.element?.tickertime).toBe(42)
    expect(apichat).not.toHaveBeenCalled()
  })

  it('aftertick single-line queue sets tickertext and does not emit chat', () => {
    jest.mocked(gadgetcheckqueue).mockReturnValueOnce(['vote update'])
    RUNTIME_FIRMWARE.aftertick(chip)
    expect(READ_CONTEXT.element?.tickertext).toBe('vote update')
    expect(READ_CONTEXT.element?.tickertime).toBe(42)
    expect(apichat).not.toHaveBeenCalled()
  })

  it('player #text keeps bubble, global tape apichat, and chat:message:player', () => {
    READ_CONTEXT.elementisplayer = true
    READ_CONTEXT.elementid = 'pid_player1'
    READ_CONTEXT.element = {
      id: 'pid_player1',
      kind: 'player',
    } as typeof READ_CONTEXT.element
    jest.mocked(memoryreadflags).mockReturnValue({ user: 'alice' } as ReturnType<
      typeof memoryreadflags
    >)

    const handler = CLI_FIRMWARE.getcommand('text')
    expect(handler).toBeDefined()
    handler!(chip, ['hello', 'world'])

    expect(READ_CONTEXT.element?.tickertext).toBe('hello world')
    expect(READ_CONTEXT.element?.tickertime).toBe(42)
    expect(apichat).toHaveBeenCalledWith(
      expect.anything(),
      'pid_player1',
      expect.stringContaining('hello world'),
    )
    expect(vmloader).toHaveBeenCalledWith(
      expect.anything(),
      'pid_player1',
      undefined,
      'text',
      'chat:message:player',
      'alice:hello world',
    )
  })
})
