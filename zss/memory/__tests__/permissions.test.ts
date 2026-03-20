import {
  DEFAULT_ALLOWLIST_BY_ROLE,
  ispermissioncontrolledcommand,
  memoryallowcommand,
  memoryapplypermissionconfig,
  memorycanruncommand,
  memorymapcommandtofamily,
  memoryreadallowlistbreakdownbyrole,
  memoryreadallowlistbyrole,
  memoryreadpermissionconfig,
  memoryrevokecommand,
  memoryserializepermissions,
  memorysetcommandpermissions,
  memorysetplayertotoken,
  memorysetrolefortoken,
} from 'zss/memory/permissions'
import { memoryreadoperator } from 'zss/memory/session'

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadoperator: jest.fn(() => 'operator'),
}))

function resettocreativedefaults() {
  memorysetcommandpermissions(
    [],
    {},
    'creative',
    {},
    {},
    undefined,
    undefined,
  )
}

describe('permissions', () => {
  beforeEach(() => {
    ;(memoryreadoperator as jest.Mock).mockReturnValue('operator')
    resettocreativedefaults()
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
    it('maps variant and base commands to families', () => {
      expect(memorymapcommandtofamily('pageexport')).toBe('risk')
      expect(memorymapcommandtofamily('synth1')).toBe('speaker')
      expect(memorymapcommandtofamily('run')).toBe('coder')
      expect(memorymapcommandtofamily('build')).toBe('build')
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
      resettocreativedefaults()
      memorysetplayertotoken('player1', 'token-a')
      memorysetrolefortoken('token-a', 'player')
      expect(memorycanruncommand('player1', 'toast')).toBe(true)
    })

    it('denies non-operator when command not on role allowlist', () => {
      ;(memoryreadoperator as jest.Mock).mockReturnValue('operator')
      memorysetplayertotoken('player1', 'token-a')
      memorysetrolefortoken('token-a', 'player')
      expect(memorycanruncommand('player1', 'allow')).toBe(false)
    })

    it('allows admin roles family; denies risk by default', () => {
      ;(memoryreadoperator as jest.Mock).mockReturnValue('operator')
      memorysetplayertotoken('player1', 'token-admin')
      memorysetrolefortoken('token-admin', 'admin')
      expect(memorycanruncommand('player1', 'nuke')).toBe(false)
      expect(memorycanruncommand('player1', 'allow')).toBe(true)
      expect(memoryreadallowlistbyrole().admin?.has('roles')).toBe(true)
      expect(memorycanruncommand('player1', 'book')).toBe(true)
    })
  })

  describe('preset and overrides', () => {
    it('memoryapplypermissionconfig lockdown sets player allowlist empty', () => {
      memoryapplypermissionconfig('lockdown')
      const allowlistbyrole = memoryreadallowlistbyrole()
      expect(allowlistbyrole.player?.size).toBe(0)
      expect(memoryreadpermissionconfig()).toBe('lockdown')
    })

    it('memoryapplypermissionconfig creative gives player build explore bridge persist', () => {
      memoryapplypermissionconfig('creative')
      const allowlistbyrole = memoryreadallowlistbyrole()
      expect(allowlistbyrole.player?.has('build')).toBe(true)
      expect(allowlistbyrole.player?.has('explore')).toBe(true)
      expect(allowlistbyrole.player?.has('bridge')).toBe(true)
    })

    it('hydrates empty allowlist from saved base preset', () => {
      memorysetcommandpermissions([], {}, 'lockdown', {}, {}, undefined, undefined)
      const allowlistbyrole = memoryreadallowlistbyrole()
      expect(memoryreadpermissionconfig()).toBe('lockdown')
      expect(allowlistbyrole.player?.size ?? 0).toBe(0)
      expect(allowlistbyrole.mod?.has('persist')).toBe(true)
    })

    it('migrates legacy custom to lockdown base plus overrides', () => {
      memorysetcommandpermissions(
        [],
        {},
        'custom',
        { player: ['speaker'] },
        { player: ['speaker'] },
      )
      expect(memoryreadpermissionconfig()).toBe('lockdown')
      expect(memoryreadallowlistbyrole().player?.has('speaker')).toBe(true)
    })

    it('keeps overrides when switching base', () => {
      memoryapplypermissionconfig('creative')
      expect(memoryallowcommand('player', 'roles')).toBe(true)
      expect(memoryreadallowlistbyrole().player?.has('roles')).toBe(true)
      memoryapplypermissionconfig('lockdown')
      expect(memoryreadallowlistbyrole().player?.has('roles')).toBe(true)
      expect(memoryreadpermissionconfig()).toBe('lockdown')
    })

    it('allow adds override; revoke removes base grant via remove set', () => {
      memoryapplypermissionconfig('creative')
      expect(memoryallowcommand('player', 'roles')).toBe(true)
      expect(memoryreadallowlistbyrole().player?.has('roles')).toBe(true)
      expect(memoryrevokecommand('player', 'build')).toBe(true)
      expect(memoryreadallowlistbyrole().player?.has('build')).toBe(false)
    })
  })

  describe('memoryserializepermissions and restore', () => {
    it('includes override maps and empty legacy custom slot', () => {
      const data = memoryserializepermissions()
      expect(data.permissionconfig).toBe('creative')
      expect(data.allowlistbyrolecustom).toEqual({})
      expect(data.permissionoverrideaddbyrole).toBeDefined()
      expect(data.permissionoverrideremovebyrole).toBeDefined()
    })

    it('round-trips overrides and base', () => {
      memoryapplypermissionconfig('lockdown')
      memoryallowcommand('player', 'risk')
      const serialized = memoryserializepermissions()
      memorysetcommandpermissions(
        [],
        {},
        serialized.permissionconfig,
        serialized.allowlistbyrole,
        {},
        serialized.permissionoverrideaddbyrole,
        serialized.permissionoverrideremovebyrole,
      )
      expect(memoryreadpermissionconfig()).toBe('lockdown')
      expect(memoryreadallowlistbyrole().player?.has('risk')).toBe(true)
    })
  })

  describe('memoryreadallowlistbreakdownbyrole', () => {
    it('tags override grants with overridegrant list', () => {
      memoryapplypermissionconfig('lockdown')
      memoryallowcommand('player', 'risk')
      const bd = memoryreadallowlistbreakdownbyrole()
      expect(bd.player?.overridegrant).toContain('risk')
      expect(bd.player?.frombase.length).toBe(0)
    })
  })

  describe('memorysetcommandpermissions from DEFAULT_ALLOWLIST_BY_ROLE shape', () => {
    it('restores creative-equivalent when arrays match creative preset', () => {
      memorysetcommandpermissions(
        [],
        {},
        'creative',
        {
          admin: DEFAULT_ALLOWLIST_BY_ROLE.admin,
          mod: DEFAULT_ALLOWLIST_BY_ROLE.mod,
          player: DEFAULT_ALLOWLIST_BY_ROLE.player,
        },
        {},
      )
      expect(memoryreadpermissionconfig()).toBe('creative')
      expect(memoryreadallowlistbyrole().player?.has('speaker')).toBe(true)
    })
  })
})
