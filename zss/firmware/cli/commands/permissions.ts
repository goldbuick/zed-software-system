import { apierror, registerstore } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { write, writeheader } from 'zss/feature/writeui'
import { FIRMWARE } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadflags } from 'zss/memory/flags'
import {
  PERMISSION_CONFIG_NAME,
  PERMISSION_CONFIG_NAMES,
  PERMISSION_CONTROLLED_GROUPS,
  PERMISSION_ROLES,
  memoryallowcommand,
  memoryapplypermissionconfig,
  memorybantoken,
  memoryreadallowlistbyrole,
  memoryreadbannedtokens,
  memoryreadpermissionconfig,
  memoryreadplayertotoken,
  memoryreadrolebytoken,
  memoryrevokecommand,
  memoryserializepermissions,
  memorysetrolefortoken,
  memoryunbantoken,
} from 'zss/memory/permissions'
import {
  memoryisoperator,
  memoryreadbookbysoftware,
  memoryreadoperator,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

export function registerPermissionsCommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command(
      'permissions',
      [ARG_TYPE.MAYBE_NAME, 'list player→role and role→command'],
      (_, words) => {
        const nonestr = '(none)'
        const [maybename] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])

        if (ispresent(maybename)) {
          const configname = NAME(maybename) as PERMISSION_CONFIG_NAME
          if (PERMISSION_CONFIG_NAMES.includes(configname)) {
            memoryapplypermissionconfig(configname)
          } else {
            apierror(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              'permissions',
              `config: ${configname} (use custom, lockdown, or creative)`,
            )
          }
        }

        writeheader(SOFTWARE, READ_CONTEXT.elementfocus, 'permissions')
        const currentconfig = memoryreadpermissionconfig()
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `selected config: $GREEN${currentconfig}`,
        )
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `other configs: $GRAY${PERMISSION_CONFIG_NAMES.filter((name) => name !== currentconfig).join(', ')}`,
        )
        write(SOFTWARE, READ_CONTEXT.elementfocus, '$32')

        for (const [group, desc] of PERMISSION_CONTROLLED_GROUPS) {
          write(SOFTWARE, READ_CONTEXT.elementfocus, `${group}: $GRAY${desc}`)
        }
        write(SOFTWARE, READ_CONTEXT.elementfocus, '$32')

        const playertotoken = memoryreadplayertotoken()
        const rolebytoken = memoryreadrolebytoken()
        const players = Object.keys(playertotoken)
        if (players.length > 0) {
          writeheader(SOFTWARE, READ_CONTEXT.elementfocus, 'player $26 role')
          for (const player of players) {
            const token = playertotoken[player]
            const role =
              rolebytoken[token] ??
              (memoryisoperator(player) ? 'operator' : 'player')
            write(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `${player} $26 $GREEN${role}`,
            )
          }
          write(SOFTWARE, READ_CONTEXT.elementfocus, '$32')
        }

        const allowlistbyrole = memoryreadallowlistbyrole()
        writeheader(SOFTWARE, READ_CONTEXT.elementfocus, 'role $26 commands')
        for (const role of PERMISSION_ROLES) {
          const set = allowlistbyrole[role]
          const list = set ? [...set].sort() : []
          write(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `$GREEN${role}: $GRAY${list.length ? list.join(', ') : nonestr}`,
          )
        }

        const banned = memoryreadbannedtokens()
        writeheader(SOFTWARE, READ_CONTEXT.elementfocus, 'banned players')
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `$GRAY${banned.length ? banned.join(', ') : nonestr}`,
        )
        return 0
      },
    )
    .command(
      'allow',
      [ARG_TYPE.NAME, ARG_TYPE.NAME, 'add command(s) to role allowlist'],
      (_, words) => {
        const [mayberole, maybecmd] = readargs(words, 0, [
          ARG_TYPE.NAME,
          ARG_TYPE.NAME,
        ])
        const role = NAME(mayberole)
        if (!PERMISSION_ROLES.includes(role)) {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'permissions',
            `invalid role: ${role}`,
          )
          return 0
        }
        const cmd = NAME(maybecmd)
        if (!memoryallowcommand(role, cmd)) {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'permissions',
            'Switch to custom config to change permissions',
          )
          return 0
        }

        const op = memoryreadoperator()
        const data = memoryserializepermissions()
        registerstore(SOFTWARE, op, 'rolebytoken', data.rolebytoken)
        registerstore(SOFTWARE, op, 'permissionconfig', data.permissionconfig)
        registerstore(SOFTWARE, op, 'allowlistbyrole', data.allowlistbyrole)
        registerstore(
          SOFTWARE,
          op,
          'allowlistbyrolecustom',
          data.allowlistbyrolecustom,
        )

        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `allowed command ${cmd} for role ${role}`,
        )
        return 0
      },
    )
    .command(
      'revoke',
      [ARG_TYPE.NAME, ARG_TYPE.NAME, 'remove command from role or revoke all'],
      (_, words) => {
        const [mayberole, maybecmd] = readargs(words, 0, [
          ARG_TYPE.NAME,
          ARG_TYPE.NAME,
        ])
        const role = NAME(mayberole)
        if (!PERMISSION_ROLES.includes(role)) {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'permissions',
            `invalid role: ${role}`,
          )
          return 0
        }
        const cmd = NAME(maybecmd)
        if (!memoryrevokecommand(role, cmd)) {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'permissions',
            'Switch to custom config to change permissions',
          )
          return 0
        }

        const op = memoryreadoperator()
        const data = memoryserializepermissions()
        registerstore(SOFTWARE, op, 'rolebytoken', data.rolebytoken)
        registerstore(SOFTWARE, op, 'permissionconfig', data.permissionconfig)
        registerstore(SOFTWARE, op, 'allowlistbyrole', data.allowlistbyrole)
        registerstore(
          SOFTWARE,
          op,
          'allowlistbyrolecustom',
          data.allowlistbyrolecustom,
        )

        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `revoked command ${cmd} for role ${role}`,
        )
        return 0
      },
    )
    .command(
      'role',
      [ARG_TYPE.NAME, ARG_TYPE.NAME, 'set player token to role'],
      (_, words) => {
        const [player, mayberole] = readargs(words, 0, [
          ARG_TYPE.NAME,
          ARG_TYPE.NAME,
        ])
        const role = NAME(mayberole)
        if (!PERMISSION_ROLES.includes(role)) {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'permissions',
            `invalid role: ${role}`,
          )
          return 0
        }
        const token = memoryreadplayertotoken()[player]
        if (!ispresent(token)) {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'permissions',
            'no token for player',
          )
          return 0
        }
        memorysetrolefortoken(token, role)

        const op = memoryreadoperator()
        const data = memoryserializepermissions()
        registerstore(SOFTWARE, op, 'rolebytoken', data.rolebytoken)

        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `set role ${role} for player ${player}`,
        )
        return 0
      },
    )
    .command(
      'ban',
      [ARG_TYPE.MAYBE_NAME, 'ban player by playerid, or list players if no id'],
      (_, words) => {
        const [player] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
        if (isstring(player)) {
          const playertotoken = memoryreadplayertotoken()
          const token = playertotoken[player]
          if (!ispresent(token)) {
            apierror(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              'ban',
              'no token for player (they may not have logged in this session)',
            )
            return 0
          }
          memorybantoken(token)

          const op = memoryreadoperator()
          const data = memoryserializepermissions()
          registerstore(SOFTWARE, op, 'bannedtokens', data.bannedtokens)

          write(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `banned player ${player} (token; login blocked)`,
          )
        } else {
          const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
          const activelistvalues = new Set<string>(mainbook?.activelist ?? [])
          activelistvalues.add(memoryreadoperator())
          const players = [...activelistvalues]
          writeheader(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'active players (use #ban <playerid> to ban)',
          )
          if (players.length === 0) {
            write(SOFTWARE, READ_CONTEXT.elementfocus, '  (none)')
          } else {
            for (const pid of players) {
              const flags = memoryreadflags(pid)
              const name = isstring(flags?.user) ? flags.user : pid
              write(SOFTWARE, READ_CONTEXT.elementfocus, `  ${pid}  ${name}`)
            }
          }
        }
        return 0
      },
    )
    .command(
      'unban',
      [
        ARG_TYPE.MAYBE_NAME,
        'unban player by playerid, or list banned players if no id',
      ],
      (_, words) => {
        const [player] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
        if (isstring(player)) {
          const playertotoken = memoryreadplayertotoken()
          const token = playertotoken[player]
          if (!ispresent(token)) {
            apierror(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              'ban',
              'no token for player (they may not have logged in this session)',
            )
            return 0
          }
          memoryunbantoken(token)

          const op = memoryreadoperator()
          const data = memoryserializepermissions()
          registerstore(SOFTWARE, op, 'bannedtokens', data.bannedtokens)

          write(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `unbanned player ${player} (token; login allowed)`,
          )
        } else {
          const bannedtokens = memoryreadbannedtokens()
          writeheader(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'banned players (use #unban <playerid> to unban)',
          )
          if (bannedtokens.length === 0) {
            write(SOFTWARE, READ_CONTEXT.elementfocus, '  (none)')
          } else {
            for (const token of bannedtokens) {
              const p = memoryreadrolebytoken()[token]
              write(SOFTWARE, READ_CONTEXT.elementfocus, `  ${p}`)
            }
          }
        }
        return 0
      },
    )
}
