import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent, isstring } from 'zss/mapping/types'

import { memoryreadoperator } from './index'

/** Commands that require a permission check for non-operator players (deny unless on role allowlist). */
export const PERMISSION_CONTROLLED_COMMANDS = new Set<string>([
  // permissions (role management)
  'allow',
  'revoke',
  'role',
  'permissions',
  // admin / operator (books, pages, session, roles, streaming)
  'agent',
  'boardopen',
  'boards',
  'bookrename',
  'booktrash',
  'broadcast',
  'chat',
  'dev',
  'fork',
  'jointab',
  'joincode',
  'loaderlogging',
  'pageopen',
  'pagetrash',
  'share',
  'trash',
  // admin UI / inspector / auth
  'admin',
  'bbs',
  'gadget',
  'findany',
  'screenshot',
  // session / world
  'endgame',
  'nuke',
  'restart',
  'save',
  // export / publish
  'bookallexport',
  'bookexport',
  'export',
  'itchiopublish',
  'pageexport',
  // discovery / content / navigation
  'goto',
  'transport',
  'zztsearch',
  'zztrandom',
  // board transforms
  'copy',
  'pivot',
  'remix',
  'revert',
  'snapshot',
  'weave',
  // board mutation (create/move/destroy elements)
  'build',
  'change',
  'dupe',
  'dupewith',
  'duplicate',
  'duplicatewith',
  'oneof',
  'oneofwith',
  'put',
  'putwith',
  'push',
  'shoot',
  'shootwith',
  'shove',
  'throwstar',
  'throwstarwith',
  'write',
  // element / code execution
  'bind',
  'die',
  'run',
  'runwith',
  'toast',
  // network
  'fetch',
  'fetchwith',
  // audio
  'autofilter',
  'autofilter1',
  'autofilter2',
  'autofilter3',
  'autofilter4',
  'autowah',
  'autowah1',
  'autowah2',
  'autowah3',
  'autowah4',
  'bgplay',
  'bgplayon16n',
  'bgplayon1n',
  'bgplayon2n',
  'bgplayon32n',
  'bgplayon4n',
  'bgplayon64n',
  'bgplayon8n',
  'bpm',
  'distort',
  'distort1',
  'distort2',
  'distort3',
  'distort4',
  'echo',
  'echo1',
  'echo2',
  'echo3',
  'echo4',
  'fcrush',
  'fcrush1',
  'fcrush2',
  'fcrush3',
  'fcrush4',
  'play',
  'reverb',
  'reverb1',
  'reverb2',
  'reverb3',
  'reverb4',
  'synth',
  'synth1',
  'synth2',
  'synth3',
  'synth4',
  'synth5',
  'synthflush',
  'synthrecord',
  'tts',
  'ttsengine',
  'ttsqueue',
  'vibrato',
  'vibrato1',
  'vibrato2',
  'vibrato3',
  'vibrato4',
])

/** Roles in strict order: operator > admin > mod > player */
export const PERMISSION_ROLES = ['operator', 'admin', 'mod', 'player'] as const
export type PERMISSION_ROLE = (typeof PERMISSION_ROLES)[number]

const PERMISSION_STATE = {
  playertotoken: {} as Record<string, string>,
  allowlistbyrole: {} as Record<string, Set<string>>,
  rolebytoken: {} as Record<string, string>,
}

export function memorycanruncommand(player: string, command: string): boolean {
  const operator = memoryreadoperator()
  if (player === operator) {
    return true
  }

  const token = PERMISSION_STATE.playertotoken[player]
  if (token === undefined) {
    apierror(SOFTWARE, player, 'permissions', 'no token (deny)')
    return false
  }

  const tokenrole = PERMISSION_STATE.rolebytoken[token] ?? 'player'
  const allowlist = PERMISSION_STATE.allowlistbyrole[tokenrole]
  return allowlist?.has(command)
}

export function memorysetplayertotoken(player: string, token: string) {
  if (isstring(player) && isstring(token)) {
    PERMISSION_STATE.playertotoken[player] = token
  }
}

/** Deserialize storage shape: allowlistbyrole values as arrays, rolebytoken as Record. */
export function memorysetcommandpermissions(
  allowlistbyrole: Record<string, string[]>,
  rolebytoken: Record<string, string>,
) {
  PERMISSION_STATE.rolebytoken = { ...rolebytoken }
  PERMISSION_STATE.allowlistbyrole = {}
  for (const role of Object.keys(allowlistbyrole ?? {})) {
    const arr = allowlistbyrole[role]
    PERMISSION_STATE.allowlistbyrole[role] = Array.isArray(arr)
      ? new Set(arr.filter(isstring))
      : new Set()
  }
}

export function memoryreadplayertotoken(): Record<string, string> {
  return { ...PERMISSION_STATE.playertotoken }
}

export function memoryreadallowlistbyrole(): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {}
  for (const role of Object.keys(PERMISSION_STATE.allowlistbyrole)) {
    out[role] = new Set(PERMISSION_STATE.allowlistbyrole[role])
  }
  return out
}

export function memoryreadrolebytoken(): Record<string, string> {
  return { ...PERMISSION_STATE.rolebytoken }
}

export function memoryallowcommand(role: string, command: string) {
  if (!PERMISSION_ROLES.includes(role as PERMISSION_ROLE)) {
    return
  }
  if (!PERMISSION_STATE.allowlistbyrole[role]) {
    PERMISSION_STATE.allowlistbyrole[role] = new Set()
  }
  PERMISSION_STATE.allowlistbyrole[role].add(command)
}

export function memoryrevokecommand(role: string, command: string) {
  if (command === 'all') {
    PERMISSION_STATE.allowlistbyrole[role] = new Set()
    return
  }
  const set = PERMISSION_STATE.allowlistbyrole[role]
  if (ispresent(set)) {
    set.delete(command)
  }
}

export function memorysetrolefortoken(token: string, role: string) {
  if (!PERMISSION_ROLES.includes(role as PERMISSION_ROLE)) {
    return
  }
  if (isstring(token)) {
    PERMISSION_STATE.rolebytoken[token] = role
  }
}

/** Serialize allowlistbyrole for storage (Sets → arrays). */
export function memoryserializepermissions(): {
  allowlistbyrole: Record<string, string[]>
  rolebytoken: Record<string, string>
} {
  const allowlistbyrole: Record<string, string[]> = {}
  for (const role of Object.keys(PERMISSION_STATE.allowlistbyrole)) {
    allowlistbyrole[role] = [...PERMISSION_STATE.allowlistbyrole[role]]
  }
  return {
    allowlistbyrole,
    rolebytoken: { ...PERMISSION_STATE.rolebytoken },
  }
}
