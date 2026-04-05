import { apierror, registerstore } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { zssheaderlines } from 'zss/feature/zsstextui'
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
  memoryreadallowlistbreakdownbyrole,
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

function persistpermissionstores() {
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
  registerstore(
    SOFTWARE,
    op,
    'permissionoverrideaddbyrole',
    data.permissionoverrideaddbyrole,
  )
  registerstore(
    SOFTWARE,
    op,
    'permissionoverrideremovebyrole',
    data.permissionoverrideremovebyrole,
  )
}

export function registerpermissionscommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command(
      'permissions',
      ['list player $26 role and role $26 commands - #access to change preset'],
      () => {
        const nonestr = '(none)'
        for (const line of zssheaderlines(
          'permissions (list) — #access lockdown | creative',
        )) {
          write(SOFTWARE, READ_CONTEXT.elementfocus, line)
        }
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `$GRAY($YELLOWyellow$GRAY = override on base preset; gray = from preset)`,
        )
        const currentconfig = memoryreadpermissionconfig()
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `current config: $GREEN${currentconfig}`,
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
          for (const line of zssheaderlines(
            'player $26 role - use #role to modify',
          )) {
            write(SOFTWARE, READ_CONTEXT.elementfocus, line)
          }
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

        const breakdownbyrole = memoryreadallowlistbreakdownbyrole()
        for (const line of zssheaderlines(
          'role $26 commands - use #allow and #revoke to modify',
        )) {
          write(SOFTWARE, READ_CONTEXT.elementfocus, line)
        }
        for (const role of PERMISSION_ROLES) {
          const row = breakdownbyrole[role]
          const og = new Set(row.overridegrant)
          const parts = row.effective.map((f) =>
            og.has(f) ? `$YELLOW${f}` : `$GRAY${f}`,
          )
          const commandsspan = parts.length
            ? parts.join('$GRAY, ')
            : `$GRAY${nonestr}`
          write(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            `$GREEN${role}: ${commandsspan}`,
          )
          if (row.overridedeny.length > 0) {
            write(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              `$GRAY  revoked vs base: ${row.overridedeny.join(', ')}`,
            )
          }
        }

        const banned = memoryreadbannedtokens()
        for (const line of zssheaderlines('banned players')) {
          write(SOFTWARE, READ_CONTEXT.elementfocus, line)
        }
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `$GRAY${banned.length ? banned.join(', ') : nonestr}`,
        )
        return 0
      },
    )
    .command(
      'access',
      [ARG_TYPE.NAME, 'base preset: lockdown or creative'],
      (_, words) => {
        const [maybename] = readargs(words, 0, [ARG_TYPE.NAME])
        const configname = NAME(maybename) as PERMISSION_CONFIG_NAME
        if (!PERMISSION_CONFIG_NAMES.includes(configname)) {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'access',
            `config: ${configname} (use lockdown or creative)`,
          )
          return 0
        }
        memoryapplypermissionconfig(configname)
        persistpermissionstores()
        write(
          SOFTWARE,
          READ_CONTEXT.elementfocus,
          `$GREENpermission mode set to ${configname}`,
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
            'invalid role for allow',
          )
          return 0
        }

        persistpermissionstores()

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
            'invalid role for revoke',
          )
          return 0
        }

        persistpermissionstores()

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
          for (const line of zssheaderlines(
            'active players (use #ban <playerid> to ban)',
          )) {
            write(SOFTWARE, READ_CONTEXT.elementfocus, line)
          }
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
          for (const line of zssheaderlines(
            'banned players (use #unban <playerid> to unban)',
          )) {
            write(SOFTWARE, READ_CONTEXT.elementfocus, line)
          }
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
