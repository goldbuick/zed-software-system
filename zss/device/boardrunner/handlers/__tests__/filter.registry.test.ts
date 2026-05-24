jest.mock('zss/memory/session', () => ({
  memoryreadboardrunner: jest.fn(),
  memoryreadroot: jest.fn(() => ({})),
  memoryreadassignedboard: jest.fn(),
  memoryreadbookbysoftware: jest.fn(),
  memoryreadhalt: jest.fn(),
  memorywriteassignedboard: jest.fn(),
  memorywriteoperator: jest.fn(),
  memorywriteboardrunner: jest.fn(),
}))

jest.mock('zss/memory/boundaries', () => ({
  memoryboundaryget: jest.fn(),
  memoryboundaryset: jest.fn(),
  memoryboundariesclear: jest.fn(),
}))

import type { MESSAGE } from 'zss/device/api'
import { shouldprocessboardrunnermessage } from 'zss/device/boardrunner/filter'
import {
  boardrunnerhandlers,
  handleboardrunnerdefault,
} from 'zss/device/boardrunner/handlers/registry'
import { memoryreadboardrunner } from 'zss/memory/session'

function makemessage(target: string, player = 'runner1'): MESSAGE {
  return {
    session: '',
    player,
    id: 'm1',
    sender: '',
    target,
  }
}

describe('shouldprocessboardrunnermessage', () => {
  beforeEach(() => {
    jest.mocked(memoryreadboardrunner).mockReturnValue('runner1')
  })

  it('allows non-player-scoped targets for any player', () => {
    expect(shouldprocessboardrunnermessage(makemessage('start', 'other'))).toBe(
      true,
    )
    expect(shouldprocessboardrunnermessage(makemessage('input', 'other'))).toBe(
      true,
    )
  })

  it('drops player-scoped targets when player is not the board runner', () => {
    expect(shouldprocessboardrunnermessage(makemessage('tick', 'other'))).toBe(
      false,
    )
    expect(shouldprocessboardrunnermessage(makemessage('paint', 'other'))).toBe(
      false,
    )
    expect(shouldprocessboardrunnermessage(makemessage('patch', 'other'))).toBe(
      false,
    )
  })

  it('allows player-scoped targets for the elected runner', () => {
    expect(shouldprocessboardrunnermessage(makemessage('tick'))).toBe(true)
    expect(shouldprocessboardrunnermessage(makemessage('idle'))).toBe(true)
  })
})

describe('boardrunnerhandlers registry', () => {
  it('maps known message targets', () => {
    expect(boardrunnerhandlers.start).toBeDefined()
    expect(boardrunnerhandlers.tick).toBeDefined()
    expect(boardrunnerhandlers.patch).toBeDefined()
  })

  it('uses default handler for chip targets not in registry', () => {
    expect(boardrunnerhandlers['chip:self:foo']).toBeUndefined()
    expect(handleboardrunnerdefault).toBeDefined()
  })
})
