import {
  DEFAULT_ALLOWLIST_BY_ROLE,
  ispermissioncontrolledcommand,
  memorycanruncommand,
  memorymapcommandtofamily,
  memorysetcommandpermissions,
  memorysetplayertotoken,
  memorysetrolefortoken,
} from 'zss/memory/permissions'

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

jest.mock('zss/memory/index', () => ({
  memoryreadoperator: jest.fn(() => 'operator'),
}))

import { memoryreadoperator } from 'zss/memory/index'

describe('permissions', () => {
  beforeEach(() => {
    ;(memoryreadoperator as jest.Mock).mockReturnValue('operator')
    memorysetcommandpermissions(
      DEFAULT_ALLOWLIST_BY_ROLE,
      {},
      [],
    )
  })

  describe('ispermissioncontrolledcommand', () => {
    it('returns true for commands in the permission-controlled command table', () => {
      expect(ispermissioncontrolledcommand('allow')).toBe(true)
      expect(ispermissioncontrolledcommand('run')).toBe(true)
      expect(ispermissioncontrolledcommand('build')).toBe(true)
    })

    it('returns true for family variant commands', () => {
      expect(ispermissioncontrolledcommand('pageexport')).toBe(true)
      expect(ispermissioncontrolledcommand('synth1')).toBe(true)
    })

    it('returns false for non-permission-controlled commands', () => {
      expect(ispermissioncontrolledcommand('shortsend')).toBe(false)
      expect(ispermissioncontrolledcommand('unknown')).toBe(false)
    })
  })

  describe('memorymapcommandtofamily', () => {
    it('returns group for variant commands', () => {
      expect(memorymapcommandtofamily('pageexport')).toBe('share')
      expect(memorymapcommandtofamily('synth1')).toBe('audio')
    })

    it('returns group for base commands', () => {
      expect(memorymapcommandtofamily('run')).toBe('execution')
      expect(memorymapcommandtofamily('build')).toBe('world')
    })
  })

  describe('memorycanruncommand', () => {
    it('allows operator to run any command', () => {
      ;(memoryreadoperator as jest.Mock).mockReturnValue('operator')
      expect(memorycanruncommand('operator', 'nuke')).toBe(true)
      expect(memorycanruncommand('operator', 'allow')).toBe(true)
    })

    it('denies non-operator with no token', () => {
      ;(memoryreadoperator as jest.Mock).mockReturnValue('operator')
      expect(memorycanruncommand('player1', 'toast')).toBe(false)
    })

    it('allows non-operator when token has role with command on allowlist', () => {
      ;(memoryreadoperator as jest.Mock).mockReturnValue('operator')
      memorysetplayertotoken('player1', 'token-a')
      memorysetrolefortoken('token-a', 'player')
      expect(memorycanruncommand('player1', 'toast')).toBe(true)
    })

    it('denies non-operator when command not on role allowlist', () => {
      ;(memoryreadoperator as jest.Mock).mockReturnValue('operator')
      memorysetplayertotoken('player1', 'token-a')
      memorysetrolefortoken('token-a', 'player')
      expect(memorycanruncommand('player1', 'nuke')).toBe(false)
    })

    it('allows admin role to run permission-controlled commands (not nuke/restart/publish/role by default)', () => {
      ;(memoryreadoperator as jest.Mock).mockReturnValue('operator')
      memorysetplayertotoken('player1', 'token-admin')
      memorysetrolefortoken('token-admin', 'admin')
      expect(memorycanruncommand('player1', 'nuke')).toBe(false)
      expect(memorycanruncommand('player1', 'book')).toBe(true)
    })
  })
})
