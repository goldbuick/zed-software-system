import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  AGENTS_ROSTER_STORAGE_KEY,
  type AGENTS_ROSTER,
} from 'zss/feature/heavy/agentsroster'
import {
  heavyrunagentstart,
  heavyrunagentstop,
  heavyrunrestoreagents,
} from 'zss/feature/heavy/agentlifecycle'

let agentidseq = 0

const mockcreateagent = jest.fn((name: string, existingid?: string) => {
  const id = existingid ?? `agent${++agentidseq}`
  return {
    id: () => id,
    stop: jest.fn(),
  }
})

const mockregisterstore = jest.fn()
const mockregisteragentdooton = jest.fn()
const mockregisteragentdootoff = jest.fn()
const mockvmpilotclear = jest.fn()
const mockheavymodelstop = jest.fn()
const mockapierror = jest.fn()
const mockworkstatus = jest.fn()

jest.mock('zss/feature/heavy/agent', () => ({
  createagent: (name: string, existingid?: string) =>
    mockcreateagent(name, existingid),
}))

jest.mock('zss/device/api', () => ({
  ...jest.requireActual('zss/device/api'),
  registerstore: (...args: unknown[]) => mockregisterstore(...args),
  registeragentdooton: (...args: unknown[]) => mockregisteragentdooton(...args),
  registeragentdootoff: (...args: unknown[]) =>
    mockregisteragentdootoff(...args),
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

const createdids: string[] = []

describe('agentlifecycle', () => {
  beforeEach(() => {
    agentidseq = 0
    createdids.length = 0
    mockcreateagent.mockClear()
    mockregisterstore.mockClear()
    mockregisteragentdooton.mockClear()
    mockregisteragentdootoff.mockClear()
    mockvmpilotclear.mockClear()
    mockheavymodelstop.mockClear()
    mockapierror.mockClear()
    mockworkstatus.mockClear()
    mockcreateagent.mockImplementation((name: string, existingid?: string) => {
      const id = existingid ?? `agent${++agentidseq}`
      createdids.push(id)
      return {
        id: () => id,
        stop: jest.fn(),
      }
    })
  })

  afterEach(() => {
    const dev = mockdevice()
    for (let i = 0; i < createdids.length; ++i) {
      heavyrunagentstop(dev, makemessage('agentstop', createdids[i]))
    }
  })

  it('starts an agent when none are running', () => {
    const dev = mockdevice()
    heavyrunagentstart(dev, makemessage('agentstart', 'helper'))
    expect(mockcreateagent).toHaveBeenCalledTimes(1)
    expect(mockcreateagent).toHaveBeenCalledWith('helper', undefined)
    expect(mockregisteragentdooton).toHaveBeenCalledTimes(1)
    expect(mockregisterstore).toHaveBeenCalledWith(
      dev,
      'human1',
      AGENTS_ROSTER_STORAGE_KEY,
      expect.objectContaining({
        ids: ['agent1'],
        names: { agent1: 'helper' },
      }),
    )
  })

  it('rejects a second start while one agent is running', () => {
    const dev = mockdevice()
    heavyrunagentstart(dev, makemessage('agentstart', 'first'))
    heavyrunagentstart(dev, makemessage('agentstart', 'second'))
    expect(mockcreateagent).toHaveBeenCalledTimes(1)
    expect(mockapierror).toHaveBeenCalledWith(
      dev,
      'human1',
      'agent',
      'only one agent per tab; stop it or open another tab',
    )
  })

  it('restores only the first agent from a multi-agent roster', () => {
    const dev = mockdevice()
    const roster: AGENTS_ROSTER = {
      ids: ['id-a', 'id-b', 'id-c'],
      names: { 'id-a': 'alpha', 'id-b': 'beta', 'id-c': 'gamma' },
    }
    heavyrunrestoreagents(dev, makemessage('restoreagents', roster))
    expect(mockcreateagent).toHaveBeenCalledTimes(1)
    expect(mockcreateagent).toHaveBeenCalledWith('alpha', 'id-a')
    expect(mockregisterstore).toHaveBeenCalledWith(
      dev,
      'human1',
      AGENTS_ROSTER_STORAGE_KEY,
      {
        ids: ['id-a'],
        names: { 'id-a': 'alpha' },
      },
    )
    expect(mockworkstatus).toHaveBeenCalledWith(
      dev,
      'human1',
      'agent restore 1 (open another tab for more)',
    )
  })

  it('allows start after stop', () => {
    const dev = mockdevice()
    heavyrunagentstart(dev, makemessage('agentstart', 'first'))
    heavyrunagentstop(dev, makemessage('agentstop', 'agent1'))
    heavyrunagentstart(dev, makemessage('agentstart', 'second'))
    expect(mockcreateagent).toHaveBeenCalledTimes(2)
    expect(mockapierror).not.toHaveBeenCalled()
  })
})
