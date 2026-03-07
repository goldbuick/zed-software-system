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
  'ban',
  'unban',
  // admin / operator (books, pages, session, roles, streaming)
  'agent',
  'book',
  'codepage',
  // integrations
  'broadcast',
  'chat',
  // admin / inspector
  'admin',
  'gadget',
  'findany',
  // session / world
  'save',
  'nuke',
  'restart',
  // content management
  'share',
  'export',
  // publish content
  'publish',
  // import content
  'zztsearch',
  'zztrandom',
  // board transforms
  'transform',
  // board mutation (create/move/destroy elements)
  'build',
  'change',
  'put',
  'shoot',
  'write',
  // element / code execution
  'bind',
  'die',
  'run',
  'toast',
  // network
  'fetch',
  // audio, we should always allow vol, bgvol, ttsvol, bgplay
  'bpm',
  'play',
  'synth',
  'tts',
  'ttsengine',
])

/**
 * Variant commands that inherit permission from a single family key.
 * Example: allowlist has 'autofilter' → grants autofilter, autofilter1, autofilter2, autofilter3, autofilter4.
 */
export const COMMAND_PERMISSION_FAMILIES: Record<string, string> = {
  //
  boards: 'codepage',
  pageopen: 'codepage',
  pagetrash: 'codepage',
  boardopen: 'codepage',
  //
  bookrename: 'book',
  booktrash: 'book',
  //
  trash: 'trash',
  //
  pageexport: 'export',
  bookexport: 'export',
  bookallexport: 'export',
  //
  bbs: 'publish',
  screenshot: 'publish',
  itchiopublish: 'publish',
  //
  copy: 'transform',
  pivot: 'transform',
  weave: 'transform',
  remix: 'transform',
  revert: 'transform',
  snapshot: 'transform',
  //
  fetchwith: 'fetch',
  //
  putwith: 'put',
  oneof: 'put',
  oneofwith: 'put',
  dupe: 'put',
  dupewith: 'put',
  duplicate: 'put',
  duplicatewith: 'put',
  //
  shootwith: 'shoot',
  throwstar: 'shoot',
  throwstarwith: 'shoot',
  //
  runwith: 'run',
  //
  ttsqueue: 'tts',
  //
  bgplayon16n: 'bgplay',
  bgplayon1n: 'bgplay',
  bgplayon2n: 'bgplay',
  bgplayon32n: 'bgplay',
  bgplayon4n: 'bgplay',
  bgplayon64n: 'bgplay',
  bgplayon8n: 'bgplay',
  //
  synthflush: 'synth',
  synthrecord: 'synth',
  autofilter1: 'synth',
  autofilter2: 'synth',
  autofilter3: 'synth',
  autofilter4: 'synth',
  autowah1: 'synth',
  autowah2: 'synth',
  autowah3: 'synth',
  autowah4: 'synth',
  distort1: 'synth',
  distort2: 'synth',
  distort3: 'synth',
  distort4: 'synth',
  echo1: 'synth',
  echo2: 'synth',
  echo3: 'synth',
  echo4: 'synth',
  fcrush1: 'synth',
  fcrush2: 'synth',
  fcrush3: 'synth',
  fcrush4: 'synth',
  reverb1: 'synth',
  reverb2: 'synth',
  reverb3: 'synth',
  reverb4: 'synth',
  synth1: 'synth',
  synth2: 'synth',
  synth3: 'synth',
  synth4: 'synth',
  synth5: 'synth',
  vibrato1: 'synth',
  vibrato2: 'synth',
  vibrato3: 'synth',
  vibrato4: 'synth',
}

/** True if the command is permission-controlled (either listed or a variant of a family). */
export function ispermissioncontrolledcommand(command: string): boolean {
  return (
    PERMISSION_CONTROLLED_COMMANDS.has(command) ||
    command in COMMAND_PERMISSION_FAMILIES
  )
}

/** Roles in strict order: operator > admin > mod > player */
export const PERMISSION_ROLES = ['operator', 'admin', 'mod', 'player'] as const
export type PERMISSION_ROLE = (typeof PERMISSION_ROLES)[number]

const PERMISSION_STATE = {
  playertotoken: {} as Record<string, string>,
  allowlistbyrole: {} as Record<string, Set<string>>,
  rolebytoken: {} as Record<string, string>,
  bannedtokens: new Set<string>(),
}

export function memorymapcommandtofamily(command: string): string {
  return COMMAND_PERMISSION_FAMILIES[command] ?? command
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

/** Deserialize storage shape: allowlistbyrole values as arrays, rolebytoken as Record, bannedtokens as array. */
export function memorysetcommandpermissions(
  allowlistbyrole: Record<string, string[]>,
  rolebytoken: Record<string, string>,
  bannedtokens?: string[],
) {
  PERMISSION_STATE.rolebytoken = { ...rolebytoken }
  PERMISSION_STATE.allowlistbyrole = {}
  for (const role of Object.keys(allowlistbyrole ?? {})) {
    const arr = allowlistbyrole[role]
    PERMISSION_STATE.allowlistbyrole[role] = Array.isArray(arr)
      ? new Set(arr.filter(isstring))
      : new Set()
  }
  // Only overwrite banned list when explicitly provided (e.g. by operator storage), so bans persist when other players log in
  if (bannedtokens !== undefined) {
    PERMISSION_STATE.bannedtokens = new Set(
      (Array.isArray(bannedtokens) ? bannedtokens : []).filter(isstring),
    )
  }
}

export function memoryistokenbanned(token: string): boolean {
  return isstring(token) && PERMISSION_STATE.bannedtokens.has(token)
}

export function memorybantoken(token: string) {
  if (isstring(token)) {
    PERMISSION_STATE.bannedtokens.add(token)
  }
}

export function memoryunbantoken(token: string) {
  if (isstring(token)) {
    PERMISSION_STATE.bannedtokens.delete(token)
  }
}

export function memoryreadbannedtokens(): string[] {
  return [...PERMISSION_STATE.bannedtokens]
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
  bannedtokens: string[]
} {
  const allowlistbyrole: Record<string, string[]> = {}
  for (const role of Object.keys(PERMISSION_STATE.allowlistbyrole)) {
    allowlistbyrole[role] = [...PERMISSION_STATE.allowlistbyrole[role]]
  }
  return {
    allowlistbyrole,
    rolebytoken: { ...PERMISSION_STATE.rolebytoken },
    bannedtokens: memoryreadbannedtokens(),
  }
}
