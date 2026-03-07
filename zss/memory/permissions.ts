import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent, isstring } from 'zss/mapping/types'

import { memoryreadoperator } from './index'

/** Group names and descriptions for allowlists (~20 toggles). */
export const PERMISSION_CONTROLLED_GROUPS = new Map<string, string>([
  ['roles', 'manage role and permission assignments'],
  ['moderation', 'ban and unban players'],
  ['workspace', 'create and manage books, pages, join codes'],
  ['operator', 'dangerous tooling'],
  ['discovery', 'list books, pages, and boards'],
  ['bridge', 'use integrations like chat and broadcast'],
  ['save', 'save sim state'],
  ['nuke', 'reset state to blank'],
  ['restart', 'clear all book flags from main'],
  ['share', 'share, export content'],
  ['publish', 'publish to bbs, screenshot, itch.io'],
  ['import', 'import content (zztsearch, zztrandom)'],
  ['transform', 'copy, pivot, weave, remix, revert, snapshot'],
  ['world', 'build, change, put, shoot, write'],
  ['execution', 'bind, die, run'],
  ['toast', 'Show toast messages'],
  ['fetch', 'Network fetch'],
  ['audio', 'audio (bpm, play, synth, bgplay, ...)'],
  ['tts', 'text-to-speech'],
  ['trash', 'trash books or pages'],
])

/** Variant commands mapped to one of PERMISSION_CONTROLLED_GROUPS. */
export const PERMISSION_CONTROLLED_COMMANDS: Record<string, string> = {
  // audio
  autofilter1: 'audio',
  autofilter2: 'audio',
  autofilter3: 'audio',
  autofilter4: 'audio',
  autowah1: 'audio',
  autowah2: 'audio',
  autowah3: 'audio',
  autowah4: 'audio',
  bgplay: 'audio',
  bgplayon16n: 'audio',
  bgplayon1n: 'audio',
  bgplayon2n: 'audio',
  bgplayon32n: 'audio',
  bgplayon4n: 'audio',
  bgplayon64n: 'audio',
  bgplayon8n: 'audio',
  bpm: 'audio',
  distort1: 'audio',
  distort2: 'audio',
  distort3: 'audio',
  distort4: 'audio',
  echo1: 'audio',
  echo2: 'audio',
  echo3: 'audio',
  echo4: 'audio',
  fcrush1: 'audio',
  fcrush2: 'audio',
  fcrush3: 'audio',
  fcrush4: 'audio',
  play: 'audio',
  reverb1: 'audio',
  reverb2: 'audio',
  reverb3: 'audio',
  reverb4: 'audio',
  synth: 'audio',
  synth1: 'audio',
  synth2: 'audio',
  synth3: 'audio',
  synth4: 'audio',
  synth5: 'audio',
  synthflush: 'audio',
  synthrecord: 'audio',
  vibrato1: 'audio',
  vibrato2: 'audio',
  vibrato3: 'audio',
  vibrato4: 'audio',

  // bridge
  broadcast: 'bridge',
  chat: 'bridge',

  // discovery
  boardopen: 'discovery',
  boards: 'discovery',
  books: 'discovery',
  pages: 'discovery',

  // execution
  bind: 'execution',
  die: 'execution',
  run: 'execution',
  runwith: 'execution',

  // fetch
  fetch: 'fetch',
  fetchwith: 'fetch',

  // import
  zztrandom: 'import',
  zztsearch: 'import',

  // moderation
  admin: 'moderation',
  ban: 'moderation',
  unban: 'moderation',

  // nuke
  nuke: 'nuke',

  // operator
  agent: 'operator',
  dev: 'operator',

  // publish
  bbs: 'publish',
  bookallexport: 'publish',
  bookexport: 'publish',
  export: 'publish',
  itchiopublish: 'publish',
  pageexport: 'publish',
  publish: 'publish',
  screenshot: 'publish',

  // restart
  restart: 'restart',

  // roles
  allow: 'roles',
  permissions: 'roles',
  revoke: 'roles',
  role: 'roles',

  // save
  save: 'save',

  // share
  share: 'share',

  // toast
  toast: 'toast',

  // transform
  copy: 'transform',
  pivot: 'transform',
  remix: 'transform',
  revert: 'transform',
  snapshot: 'transform',
  transform: 'transform',
  weave: 'transform',

  // trash
  booktrash: 'trash',
  pagetrash: 'trash',
  trash: 'trash',

  // tts
  tts: 'tts',
  ttsengine: 'tts',
  ttsqueue: 'tts',

  // world
  build: 'world',
  change: 'world',
  dupe: 'world',
  dupewith: 'world',
  duplicate: 'world',
  duplicatewith: 'world',
  findany: 'world',
  gadget: 'world',
  oneof: 'world',
  oneofwith: 'world',
  put: 'world',
  putwith: 'world',
  shoot: 'world',
  shootwith: 'world',
  throwstar: 'world',
  throwstarwith: 'world',
  write: 'world',

  // workspace
  stat: 'workspace', // create a new codepage
  pageopen: 'workspace', // open an existing codepage
  bookrename: 'workspace', // rename a book
  fork: 'workspace',
  joincode: 'bridge',
  jointab: 'bridge',
}

/** Groups withheld from admin by default (roles, publish, import, nuke, restart). */
const ADMIN_DEFAULT_DENY = new Set([
  'roles',
  'nuke',
  'restart',
  'publish',
  'import',
])

/** Default allowlist for admin: all groups except ADMIN_DEFAULT_DENY. */
export const DEFAULT_ALLOWLIST_ADMIN: string[] = [
  ...PERMISSION_CONTROLLED_GROUPS.keys(),
].filter((c) => !ADMIN_DEFAULT_DENY.has(c))

/** Default allowlist for mod: moderate and create content; no roles, workspace/operator/admin, nuke/restart. */
export const DEFAULT_ALLOWLIST_MOD: string[] = [
  'moderation',
  'bridge',
  'save',
  'share',
  'publish',
  'import',
  'transform',
  'world',
  'execution',
  'toast',
  'fetch',
  'audio',
  'tts',
]

/** Default allowlist for player: share/export own, toast, basic audio and tts. */
export const DEFAULT_ALLOWLIST_PLAYER: string[] = [
  'share',
  'toast',
  'audio',
  'tts',
]

/** Default allowlistbyrole for admin, mod, player (operator bypasses; use when initializing or resetting permissions). */
export const DEFAULT_ALLOWLIST_BY_ROLE: Record<string, string[]> = {
  admin: DEFAULT_ALLOWLIST_ADMIN,
  mod: DEFAULT_ALLOWLIST_MOD,
  player: DEFAULT_ALLOWLIST_PLAYER,
}

/** True if the command is permission-controlled (key in PERMISSION_CONTROLLED_COMMANDS table). */
export function ispermissioncontrolledcommand(command: string): boolean {
  return command in PERMISSION_CONTROLLED_COMMANDS
}

/** Assignable roles (operator is session identity, not assignable). Order: admin > mod > player */
export const PERMISSION_ROLES = ['admin', 'mod', 'player'] as const
export type PERMISSION_ROLE = (typeof PERMISSION_ROLES)[number]

/** Permission config preset names. Custom = current allowlists; lockdown/creative replace allowlistbyrole. */
export const PERMISSION_CONFIG_NAMES = [
  'custom',
  'lockdown',
  'creative',
] as const
export type PermissionConfigName = (typeof PERMISSION_CONFIG_NAMES)[number]

/** Lockdown: player nothing; mod observe + moderate only; admin unchanged. */
const LOCKDOWN_ALLOWLIST_PLAYER: string[] = []
const LOCKDOWN_ALLOWLIST_MOD: string[] = [
  'moderation',
  'bridge',
  'save',
  'share',
  'discovery',
  'toast',
]

/** Creative: player create/edit content and world; mod and admin unchanged. */
const CREATIVE_ALLOWLIST_PLAYER: string[] = [
  'discovery',
  'workspace',
  'world',
  'transform',
  'execution',
  'share',
  'toast',
  'fetch',
  'audio',
  'tts',
  'trash',
]

/** Preset allowlistbyrole by config name. custom = do not overwrite when applying. */
export const PERMISSION_PRESETS: Record<
  PermissionConfigName,
  Record<string, string[]>
> = {
  custom: {},
  lockdown: {
    admin: DEFAULT_ALLOWLIST_ADMIN,
    mod: LOCKDOWN_ALLOWLIST_MOD,
    player: LOCKDOWN_ALLOWLIST_PLAYER,
  },
  creative: {
    admin: DEFAULT_ALLOWLIST_ADMIN,
    mod: DEFAULT_ALLOWLIST_MOD,
    player: CREATIVE_ALLOWLIST_PLAYER,
  },
}

const PERMISSION_STATE = {
  playertotoken: {} as Record<string, string>,
  allowlistbyrole: {} as Record<string, Set<string>>,
  rolebytoken: {} as Record<string, string>,
  bannedtokens: new Set<string>(),
  permissionconfig: 'custom' as PermissionConfigName,
}

export function memorymapcommandtofamily(command: string): string {
  return PERMISSION_CONTROLLED_COMMANDS[command] ?? command
}

/**
 * Returns true if this player may run the command. Operator always may; non-operator
 * must have a token and a role whose allowlist includes the command (or its family).
 * On deny, reports apierror and returns false. Call only for CLI driver + player context.
 */
export function memorycanruncommand(player: string, command: string): boolean {
  if (player === memoryreadoperator()) {
    return true
  }
  if (!ispermissioncontrolledcommand(command)) {
    return true
  }
  const family = memorymapcommandtofamily(command)
  const token = PERMISSION_STATE.playertotoken[player]
  if (token === undefined) {
    apierror(SOFTWARE, player, 'permissions', 'no token (deny)')
    return false
  }
  const tokenrole = PERMISSION_STATE.rolebytoken[token] ?? 'player'
  const allowlist = PERMISSION_STATE.allowlistbyrole[tokenrole]
  const allowed = allowlist?.has(family) ?? false
  if (!allowed) {
    apierror(SOFTWARE, player, 'permissions', `${family} (deny)`)
    return false
  }
  return true
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
  permissionconfig?: string,
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
  if (
    isstring(permissionconfig) &&
    PERMISSION_CONFIG_NAMES.includes(permissionconfig as PermissionConfigName)
  ) {
    PERMISSION_STATE.permissionconfig = permissionconfig as PermissionConfigName
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
  PERMISSION_STATE.permissionconfig = 'custom'
}

export function memoryrevokecommand(role: string, command: string) {
  if (command === 'all') {
    PERMISSION_STATE.allowlistbyrole[role] = new Set()
    PERMISSION_STATE.permissionconfig = 'custom'
    return
  }
  const set = PERMISSION_STATE.allowlistbyrole[role]
  if (ispresent(set)) {
    set.delete(command)
    PERMISSION_STATE.permissionconfig = 'custom'
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

export function memoryreadpermissionconfig(): PermissionConfigName {
  return PERMISSION_STATE.permissionconfig
}

export function memorysetpermissionconfig(name: PermissionConfigName) {
  PERMISSION_STATE.permissionconfig = name
}

/**
 * Apply a permission preset. Replaces allowlistbyrole for lockdown/creative;
 * for custom only sets config name. Does not change rolebytoken or bannedtokens.
 */
export function memoryapplypermissionconfig(name: PermissionConfigName) {
  PERMISSION_STATE.permissionconfig = name
  if (name === 'custom') {
    return
  }
  const preset = PERMISSION_PRESETS[name]
  PERMISSION_STATE.allowlistbyrole = {}
  for (const role of Object.keys(preset)) {
    const arr = preset[role]
    PERMISSION_STATE.allowlistbyrole[role] = Array.isArray(arr)
      ? new Set(arr.filter(isstring))
      : new Set()
  }
}

/** Serialize allowlistbyrole for storage (Sets → arrays). */
export function memoryserializepermissions(): {
  allowlistbyrole: Record<string, string[]>
  rolebytoken: Record<string, string>
  bannedtokens: string[]
  permissionconfig: PermissionConfigName
} {
  const allowlistbyrole: Record<string, string[]> = {}
  for (const role of Object.keys(PERMISSION_STATE.allowlistbyrole)) {
    allowlistbyrole[role] = [...PERMISSION_STATE.allowlistbyrole[role]]
  }
  return {
    allowlistbyrole,
    rolebytoken: { ...PERMISSION_STATE.rolebytoken },
    bannedtokens: memoryreadbannedtokens(),
    permissionconfig: PERMISSION_STATE.permissionconfig,
  }
}
