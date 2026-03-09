import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { deepcopy, isstring } from 'zss/mapping/types'

import { memoryreadoperator } from './session'

/** Group names and descriptions for allowlists (~20 toggles). */
export const PERMISSION_CONTROLLED_GROUPS = new Map<string, string>([
  ['audio', 'audio (bpm, play, synth, bgplay, ...)'],
  ['bridge', 'use integrations like chat, join codes, and broadcast'],
  ['coder', 'create and edit codepages'],
  ['discovery', 'list books, pages, and boards'],
  ['execution', 'bind, die, run'],
  ['fetch', 'network fetch'],
  ['import', 'import content (zztsearch, zztrandom)'],
  ['moderation', 'ban and unban players'],
  ['nuke', 'reset state to blank'],
  ['operator', 'dangerous tooling'],
  ['publish', 'publish to bbs, screenshot, itch.io'],
  ['roles', 'manage role and permission assignments'],
  ['save', 'save sim state'],
  ['share', 'share, export content'],
  ['toast', 'Show toast messages'],
  ['transform', 'copy, pivot, weave, remix, revert, snapshot'],
  ['trash', 'trash books or pages'],
  ['tts', 'text-to-speech'],
  ['world', 'build, change, put, shoot, write'],
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
  joincode: 'bridge',
  jointab: 'bridge',

  // coder
  pageopen: 'coder', // open an existing codepage
  stat: 'coder', // create a new codepage

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
  dev: 'operator',
  fork: 'operator',
  agent: 'operator',
  restart: 'operator',
  bookrename: 'operator',

  // publish
  bbs: 'publish',
  export: 'publish',
  screenshot: 'publish',
  pageexport: 'publish',
  bookexport: 'publish',
  bookallexport: 'publish',
  itchiopublish: 'publish',

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
export const PERMISSION_ROLES: string[] = ['admin', 'mod', 'player']

/** Permission config preset names. Custom = current allowlists; lockdown/creative replace allowlistbyrole. */
export const PERMISSION_CONFIG_NAMES = [
  'custom',
  'lockdown',
  'creative',
] as const

export type PERMISSION_CONFIG_NAME = (typeof PERMISSION_CONFIG_NAMES)[number]

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

/** Preset allowlistbyrole by config name. custom defaults to same values as lockdown. */
export const PERMISSION_PRESETS: Record<
  PERMISSION_CONFIG_NAME,
  Record<string, string[]>
> = {
  custom: {
    admin: [...DEFAULT_ALLOWLIST_ADMIN],
    mod: [...LOCKDOWN_ALLOWLIST_MOD],
    player: [...LOCKDOWN_ALLOWLIST_PLAYER],
  },
  lockdown: {
    admin: [...DEFAULT_ALLOWLIST_ADMIN],
    mod: [...LOCKDOWN_ALLOWLIST_MOD],
    player: [...LOCKDOWN_ALLOWLIST_PLAYER],
  },
  creative: {
    admin: [...DEFAULT_ALLOWLIST_ADMIN],
    mod: [...DEFAULT_ALLOWLIST_MOD],
    player: [...CREATIVE_ALLOWLIST_PLAYER],
  },
}

function allowlistbyrolefrompreset(
  preset: Record<string, string[]>,
): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {}
  for (const role of Object.keys(preset)) {
    const arr = preset[role]
    out[role] = Array.isArray(arr) ? new Set(arr.filter(isstring)) : new Set()
  }
  return out
}

function allowlistbyroletoserialized(
  byrole: Record<string, Set<string>>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const role of Object.keys(byrole)) {
    out[role] = [...byrole[role]]
  }
  return out
}

/** In-memory custom config snapshot; used when applying custom or when switching away from custom. */

const PERMISSION_STATE = {
  playertotoken: {} as Record<string, string>,
  rolebytoken: {} as Record<string, string>,
  bannedtokens: new Set<string>(),
  permissionconfig: 'creative' as PERMISSION_CONFIG_NAME,
  allowlistbyrole: allowlistbyrolefrompreset(PERMISSION_PRESETS.creative),
  allowlistbyrolecustom: allowlistbyrolefrompreset(PERMISSION_PRESETS.lockdown),
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
  bannedtokens: string[],
  rolebytoken: Record<string, string>,
  permissionconfig: PERMISSION_CONFIG_NAME,
  allowlistbyrole: Record<string, string[]>,
  allowlistbyrolecustom: Record<string, string[]>,
) {
  PERMISSION_STATE.bannedtokens = new Set(bannedtokens)
  PERMISSION_STATE.rolebytoken = deepcopy(rolebytoken)
  PERMISSION_STATE.permissionconfig = permissionconfig
  PERMISSION_STATE.allowlistbyrole = allowlistbyrolefrompreset(allowlistbyrole)
  PERMISSION_STATE.allowlistbyrolecustom = allowlistbyrolefrompreset(
    allowlistbyrolecustom,
  )
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

export function memoryallowcommand(role: string, command: string): boolean {
  if (
    PERMISSION_STATE.permissionconfig !== 'custom' ||
    !PERMISSION_ROLES.includes(role)
  ) {
    return false
  }
  // update active state
  PERMISSION_STATE.allowlistbyrole[role] ??= new Set()
  PERMISSION_STATE.allowlistbyrole[role].add(command)
  // update custompermissionconfig
  PERMISSION_STATE.allowlistbyrolecustom[role] ??= new Set()
  PERMISSION_STATE.allowlistbyrolecustom[role].add(command)
  return true
}

export function memoryrevokecommand(role: string, command: string): boolean {
  if (
    PERMISSION_STATE.permissionconfig !== 'custom' ||
    !PERMISSION_ROLES.includes(role)
  ) {
    return false
  }
  // update active state
  PERMISSION_STATE.allowlistbyrole[role]?.delete(command)
  // update custompermissionconfig
  PERMISSION_STATE.allowlistbyrolecustom[role]?.delete(command)
  return true
}

export function memorysetrolefortoken(token: string, role: string) {
  if (!PERMISSION_ROLES.includes(role)) {
    return
  }
  if (isstring(token)) {
    PERMISSION_STATE.rolebytoken[token] = role
  }
}

export function memoryreadpermissionconfig(): PERMISSION_CONFIG_NAME {
  return PERMISSION_STATE.permissionconfig
}

/**
 * Apply a permission preset. Replaces allowlistbyrole with the preset (custom defaults to lockdown values).
 * Does not change rolebytoken or bannedtokens. When switching from custom, saves current allowlist to custom snapshot.
 */
export function memoryapplypermissionconfig(name: PERMISSION_CONFIG_NAME) {
  PERMISSION_STATE.permissionconfig = name
  if (name === 'custom') {
    PERMISSION_STATE.allowlistbyrole = deepcopy(
      PERMISSION_STATE.allowlistbyrolecustom,
    )
  } else {
    PERMISSION_STATE.allowlistbyrole = allowlistbyrolefrompreset(
      PERMISSION_PRESETS[name],
    )
  }
}

/** Serialize allowlistbyrole for storage (Sets → arrays). */
export function memoryserializepermissions(): {
  rolebytoken: Record<string, string>
  bannedtokens: string[]
  permissionconfig: PERMISSION_CONFIG_NAME
  allowlistbyrole: Record<string, string[]>
  allowlistbyrolecustom: Record<string, string[]>
} {
  return {
    rolebytoken: deepcopy(PERMISSION_STATE.rolebytoken),
    bannedtokens: memoryreadbannedtokens(),
    permissionconfig: deepcopy(PERMISSION_STATE.permissionconfig),
    allowlistbyrole: allowlistbyroletoserialized(
      PERMISSION_STATE.allowlistbyrole,
    ),
    allowlistbyrolecustom: allowlistbyroletoserialized(
      PERMISSION_STATE.allowlistbyrolecustom,
    ),
  }
}
