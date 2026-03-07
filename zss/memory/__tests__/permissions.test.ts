import { memoryreadoperator } from 'zss/memory/index'
import {
  DEFAULT_ALLOWLIST_BY_ROLE,
  ispermissioncontrolledcommand,
  memoryallowcommand,
  memoryapplypermissionconfig,
  memorycanruncommand,
  memorymapcommandtofamily,
  memoryreadallowlistbyrole,
  memoryreadpermissionconfig,
  memoryrevokecommand,
  memoryserializepermissions,
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

describe('permissions', () => {
  beforeEach(() => {
    ;(memoryreadoperator as jest.Mock).mockReturnValue('operator')
    memorysetcommandpermissions(DEFAULT_ALLOWLIST_BY_ROLE, {}, [], 'custom')
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

  describe('permission config presets', () => {
    it('memoryapplypermissionconfig lockdown sets player allowlist empty', () => {
      memorysetcommandpermissions(DEFAULT_ALLOWLIST_BY_ROLE, {}, [])
      memoryapplypermissionconfig('lockdown')
      const allowlistbyrole = memoryreadallowlistbyrole()
      expect(allowlistbyrole.player?.size).toBe(0)
      expect(memoryreadpermissionconfig()).toBe('lockdown')
    })

    it('memoryapplypermissionconfig creative gives player world and workspace', () => {
      memorysetcommandpermissions(DEFAULT_ALLOWLIST_BY_ROLE, {}, [])
      memoryapplypermissionconfig('creative')
      const allowlistbyrole = memoryreadallowlistbyrole()
      expect(allowlistbyrole.player?.has('world')).toBe(true)
      expect(allowlistbyrole.player?.has('workspace')).toBe(true)
      expect(allowlistbyrole.player?.has('transform')).toBe(true)
      expect(memoryreadpermissionconfig()).toBe('creative')
    })

    it('memoryapplypermissionconfig custom does not overwrite allowlists', () => {
      memorysetcommandpermissions(DEFAULT_ALLOWLIST_BY_ROLE, {}, [])
      memoryallowcommand('player', 'nuke')
      memoryapplypermissionconfig('custom')
      const allowlistbyrole = memoryreadallowlistbyrole()
      expect(allowlistbyrole.player?.has('nuke')).toBe(true)
      expect(memoryreadpermissionconfig()).toBe('custom')
    })

    it('memoryserializepermissions includes permissionconfig', () => {
      memorysetcommandpermissions(DEFAULT_ALLOWLIST_BY_ROLE, {}, [])
      memoryapplypermissionconfig('lockdown')
      const data = memoryserializepermissions()
      expect(data.permissionconfig).toBe('lockdown')
    })

    it('memorysetcommandpermissions restores permissionconfig', () => {
      memorysetcommandpermissions(DEFAULT_ALLOWLIST_BY_ROLE, {}, [], 'creative')
      expect(memoryreadpermissionconfig()).toBe('creative')
    })

    it('allow sets config to custom', () => {
      memorysetcommandpermissions(DEFAULT_ALLOWLIST_BY_ROLE, {}, [])
      memoryapplypermissionconfig('lockdown')
      memoryallowcommand('player', 'toast')
      expect(memoryreadpermissionconfig()).toBe('custom')
    })

    it('revoke sets config to custom', () => {
      memorysetcommandpermissions(DEFAULT_ALLOWLIST_BY_ROLE, {}, [])
      memoryapplypermissionconfig('creative')
      memoryrevokecommand('player', 'world')
      expect(memoryreadpermissionconfig()).toBe('custom')
    })
  })
})
