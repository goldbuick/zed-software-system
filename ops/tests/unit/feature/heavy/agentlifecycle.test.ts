import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  hasagentsession,
  heavyrunagentstart,
  heavyrunagentstop,
  heavyrunrestoreagents,
  resetagentsessionsfortest,
} from 'zss/feature/heavy/agentlifecycle'
import {
  type AGENTS_ROSTER,
  AGENTS_ROSTER_STORAGE_KEY,
  migrateroster,
} from 'zss/feature/heavy/agentsroster'

const mockregisterstore = jest.fn()
const mockvmpilotclear = jest.fn()
const mockheavymodelstop = jest.fn()
const mockapierror = jest.fn()
const mockworkstatus = jest.fn()

jest.mock('zss/device/api', () => ({
  ...jest.requireActual('zss/device/api'),
  registerstore: (...args: unknown[]) => mockregisterstore(...args),
  vmpilotclear: (...args: unknown[]) => mockvmpilotclear(...args),
  heavymodelstop: (...args: unknown[]) => mockheavymodelstop(...args),
  apierror: (...args: unknown[]) => mockapierror(...args),
  workstatus: (...args: unknown[]) => mockworkstatus(...args),
}))

jest.mock('zss/feature/terminalwritelines', () => ({
  terminalwritelines: jest.fn(),
}))

jest.mock('zss/feature/writeui', () => ({
  write: jest.fn(),
}))

jest.mock('zss/feature/zsstextui', () => ({
  zssheaderlines: jest.fn(() => []),
}))

function mockdevice(): DEVICE {
  return { emit: jest.fn() } as unknown as DEVICE
}

function makemessage(
  target: string,
  data?: unknown,
  player = 'human1',
): MESSAGE {
  return {
    session: 'session1',
    player,
    id: 'msg1',
    sender: 'test',
    target,
    data,
  }
}

describe('agentsroster', () => {
  it('migrates legacy roster shape', () => {
    expect(
      migrateroster({
        ids: ['id-a', 'id-b'],
        names: { 'id-a': 'alpha', 'id-b': 'beta' },
      }),
    ).toEqual({ name: 'alpha' })
  })
})

describe('agentlifecycle', () => {
  const player = 'human1'

  beforeEach(() => {
    resetagentsessionsfortest()
    mockregisterstore.mockClear()
    mockvmpilotclear.mockClear()
    mockheavymodelstop.mockClear()
    mockapierror.mockClear()
    mockworkstatus.mockClear()
  })

  afterEach(() => {
    resetagentsessionsfortest()
  })

  it('starts an agent session keyed by register player', () => {
    const dev = mockdevice()
    heavyrunagentstart(dev, makemessage('agentstart', 'helper', player))
    expect(hasagentsession(player)).toBe(true)
    expect(mockregisterstore).toHaveBeenCalledWith(
      dev,
      player,
      AGENTS_ROSTER_STORAGE_KEY,
      { name: 'helper' },
    )
    expect(mockworkstatus).toHaveBeenCalledWith(
      dev,
      player,
      'agent start helper',
    )
  })

  it('rejects a second start while one agent is running', () => {
    const dev = mockdevice()
    heavyrunagentstart(dev, makemessage('agentstart', 'first', player))
    heavyrunagentstart(dev, makemessage('agentstart', 'second', player))
    expect(mockapierror).toHaveBeenCalledWith(
      dev,
      player,
      'agent',
      'agent already running',
    )
  })

  it('restores agent name from roster without login', () => {
    const dev = mockdevice()
    const roster: AGENTS_ROSTER = { name: 'alpha' }
    heavyrunrestoreagents(dev, makemessage('restoreagents', roster, player))
    expect(hasagentsession(player)).toBe(true)
    expect(mockregisterstore).toHaveBeenCalledWith(
      dev,
      player,
      AGENTS_ROSTER_STORAGE_KEY,
      { name: 'alpha' },
    )
    expect(mockworkstatus).toHaveBeenCalledWith(
      dev,
      player,
      'agent start alpha',
    )
  })

  it('restores from legacy roster via migrateroster in register path', () => {
    expect(
      migrateroster({
        ids: ['id-a', 'id-b'],
        names: { 'id-a': 'alpha', 'id-b': 'beta' },
      }),
    ).toEqual({ name: 'alpha' })
  })

  it('allows start after stop', () => {
    const dev = mockdevice()
    heavyrunagentstart(dev, makemessage('agentstart', 'first', player))
    heavyrunagentstop(dev, makemessage('agentstop', undefined, player))
    heavyrunagentstart(dev, makemessage('agentstart', 'second', player))
    expect(hasagentsession(player)).toBe(true)
    expect(mockapierror).not.toHaveBeenCalled()
  })

  it('stops without requiring an agent id', () => {
    const dev = mockdevice()
    heavyrunagentstart(dev, makemessage('agentstart', 'helper', player))
    heavyrunagentstop(dev, makemessage('agentstop', undefined, player))
    expect(hasagentsession(player)).toBe(false)
    expect(mockheavymodelstop).toHaveBeenCalledWith(dev, player, player)
    expect(mockvmpilotclear).toHaveBeenCalledWith(dev, player, player)
  })
})
