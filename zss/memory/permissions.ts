import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { deepcopy, isstring } from 'zss/mapping/types'

import { memoryreadoperator } from './session'

/** Group names and descriptions for allowlists (nine families). */
export const PERMISSION_CONTROLLED_GROUPS = new Map<string, string>([
  ['bridge', 'chat, join, broadcast, fetch, bridge status'],
  ['build', 'world edit: put, shoot, copy, weave, and other transforms'],
  ['coder', 'codepages, books/pages lists, bind, die, run'],
  ['explore', 'boards, boardopen, goto'],
  ['moderation', 'ban and unban players'],
  ['persist', 'save sim state, share content'],
  ['risk', 'import, nuke, publish/export, trash, operator tooling'],
  ['roles', 'manage role and permission assignments'],
  ['speaker', 'play, synth, bgplay, toast, TTS'],
])

/** Variant commands mapped to one of PERMISSION_CONTROLLED_GROUPS. */
export const PERMISSION_CONTROLLED_COMMANDS: Record<string, string> = {
  bridge: 'bridge',
  broadcast: 'bridge',
  chat: 'bridge',
  fetch: 'bridge',
  fetchwith: 'bridge',
  joincode: 'bridge',
  jointab: 'bridge',

  build: 'build',
  change: 'build',
  copy: 'build',
  dupe: 'build',
  dupewith: 'build',
  duplicate: 'build',
  duplicatewith: 'build',
  findany: 'build',
  gadget: 'build',
  oneof: 'build',
  oneofwith: 'build',
  pivot: 'build',
  put: 'build',
  putwith: 'build',
  remix: 'build',
  revert: 'build',
  shoot: 'build',
  shootwith: 'build',
  snapshot: 'build',
  throwstar: 'build',
  throwstarwith: 'build',
  transform: 'build',
  weave: 'build',
  write: 'build',

  bind: 'coder',
  books: 'coder',
  die: 'coder',
  grep: 'coder',
  pageopen: 'coder',
  pages: 'coder',
  run: 'coder',
  runwith: 'coder',
  search: 'coder',
  stat: 'coder',

  boardopen: 'explore',
  boards: 'explore',
  goto: 'explore',

  admin: 'moderation',
  ban: 'moderation',
  unban: 'moderation',

  save: 'persist',
  share: 'persist',

  access: 'risk',
  agent: 'risk',
  bbs: 'risk',
  bookallexport: 'risk',
  bookexport: 'risk',
  bookrename: 'risk',
  booktrash: 'risk',
  dev: 'risk',
  export: 'risk',
  fork: 'risk',
  itchiopublish: 'risk',
  nuke: 'risk',
  pageexport: 'risk',
  pagetrash: 'risk',
  restart: 'risk',
  screenshot: 'risk',
  trash: 'risk',
  zztrandom: 'risk',
  zztsearch: 'risk',

  allow: 'roles',
  permissions: 'roles',
  revoke: 'roles',
  role: 'roles',

  autofilter1: 'speaker',
  autofilter2: 'speaker',
  autofilter3: 'speaker',
  autofilter4: 'speaker',
  autowah1: 'speaker',
  autowah2: 'speaker',
  autowah3: 'speaker',
  autowah4: 'speaker',
  bgplay: 'speaker',
  bgplayon16n: 'speaker',
  bgplayon1n: 'speaker',
  bgplayon2n: 'speaker',
  bgplayon32n: 'speaker',
  bgplayon4n: 'speaker',
  bgplayon64n: 'speaker',
  bgplayon8n: 'speaker',
  distort1: 'speaker',
  distort2: 'speaker',
  distort3: 'speaker',
  distort4: 'speaker',
  echo1: 'speaker',
  echo2: 'speaker',
  echo3: 'speaker',
  echo4: 'speaker',
  fcrush1: 'speaker',
  fcrush2: 'speaker',
  fcrush3: 'speaker',
  fcrush4: 'speaker',
  play: 'speaker',
  reverb1: 'speaker',
  reverb2: 'speaker',
  reverb3: 'speaker',
  reverb4: 'speaker',
  synth: 'speaker',
  synth1: 'speaker',
  synth2: 'speaker',
  synth3: 'speaker',
  synth4: 'speaker',
  synth5: 'speaker',
  synthflush: 'speaker',
  synthrecord: 'speaker',
  toast: 'speaker',
  tts: 'speaker',
  ttsengine: 'speaker',
  ttsqueue: 'speaker',
  vibrato1: 'speaker',
  vibrato2: 'speaker',
  vibrato3: 'speaker',
  vibrato4: 'speaker',
}

/** Groups withheld from admin by default (no import/nuke/publish/tooling surface). */
const ADMIN_DEFAULT_DENY = new Set(['risk'])

/** Default allowlist for admin: all groups except ADMIN_DEFAULT_DENY. */
export const DEFAULT_ALLOWLIST_ADMIN: string[] = [
  ...PERMISSION_CONTROLLED_GROUPS.keys(),
].filter((c) => !ADMIN_DEFAULT_DENY.has(c))

/** Default allowlist for mod: same as creative mod (init / DEFAULT_ALLOWLIST_BY_ROLE). */
export const CREATIVE_ALLOWLIST_MOD: string[] = [
  'moderation',
  'bridge',
  'explore',
  'coder',
  'build',
  'persist',
  'speaker',
]

/** Default allowlist for player: speaker only. */
export const DEFAULT_ALLOWLIST_PLAYER: string[] = ['speaker']

/** Default allowlistbyrole for admin, mod, player (operator bypasses; use when initializing or resetting permissions). */
export const DEFAULT_ALLOWLIST_BY_ROLE: Record<string, string[]> = {
  admin: DEFAULT_ALLOWLIST_ADMIN,
  mod: CREATIVE_ALLOWLIST_MOD,
  player: DEFAULT_ALLOWLIST_PLAYER,
}

/** True if the command is permission-controlled (key in PERMISSION_CONTROLLED_COMMANDS table). */
export function ispermissioncontrolledcommand(command: string): boolean {
  return command in PERMISSION_CONTROLLED_COMMANDS
}

function normalizetofamilyforallowlist(input: string): string {
  if (ispermissioncontrolledcommand(input)) {
    return PERMISSION_CONTROLLED_COMMANDS[input]
  }
  return input
}

/** Assignable roles (operator is session identity, not assignable). Order: admin > mod > player */
export const PERMISSION_ROLES: string[] = ['admin', 'mod', 'player']

/** Base preset only: overrides are stored separately. */
export const PERMISSION_CONFIG_NAMES = ['lockdown', 'creative'] as const

export type PERMISSION_CONFIG_NAME = (typeof PERMISSION_CONFIG_NAMES)[number]

const LOCKDOWN_ALLOWLIST_PLAYER: string[] = []
const LOCKDOWN_ALLOWLIST_MOD: string[] = [
  'moderation',
  'bridge',
  'explore',
  'coder',
  'speaker',
  'persist',
]

const CREATIVE_ALLOWLIST_PLAYER: string[] = [
  'explore',
  'coder',
  'build',
  'persist',
  'speaker',
]

/** Preset allowlistbyrole by base config name. */
export const PERMISSION_PRESETS: Record<
  PERMISSION_CONFIG_NAME,
  Record<string, string[]>
> = {
  lockdown: {
    admin: [...DEFAULT_ALLOWLIST_ADMIN],
    mod: [...LOCKDOWN_ALLOWLIST_MOD],
    player: [...LOCKDOWN_ALLOWLIST_PLAYER],
  },
  creative: {
    admin: [...DEFAULT_ALLOWLIST_ADMIN],
    mod: [...CREATIVE_ALLOWLIST_MOD],
    player: [...CREATIVE_ALLOWLIST_PLAYER],
  },
}

function allowlistbyrolefrompreset(
  preset: Record<string, string[]>,
): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {}
  for (const role of Object.keys(preset)) {
    const arr = preset[role]
    const raw = Array.isArray(arr) ? arr.filter(isstring) : []
    out[role] = new Set(raw)
  }
  return out
}

function allowlistbyroletoserialized(
  byrole: Record<string, Set<string>>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const role of Object.keys(byrole)) {
    out[role] = [...byrole[role]].sort()
  }
  return out
}

function emptyoverridebyrole(): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {}
  for (const role of PERMISSION_ROLES) {
    out[role] = new Set()
  }
  return out
}

function presetrolefamilies(
  base: PERMISSION_CONFIG_NAME,
  role: string,
): Set<string> {
  const arr = PERMISSION_PRESETS[base][role]
  return new Set(Array.isArray(arr) ? arr.filter(isstring) : [])
}

function isallowlistmeaningful(
  allowlistbyrole: Record<string, string[]>,
): boolean {
  for (const role of PERMISSION_ROLES) {
    const arr = allowlistbyrole[role]
    if (Array.isArray(arr) && arr.some(isstring)) {
      return true
    }
  }
  return false
}

function recordtooverridesets(
  r: Record<string, string[]> | undefined,
): Record<string, Set<string>> {
  const out = emptyoverridebyrole()
  if (!r) {
    return out
  }
  for (const role of PERMISSION_ROLES) {
    const arr = r[role]
    if (Array.isArray(arr)) {
      for (const x of arr) {
        if (isstring(x)) {
          out[role].add(x)
        }
      }
    }
  }
  return out
}

function hasanyoverrideentries(
  add?: Record<string, string[]>,
  remove?: Record<string, string[]>,
): boolean {
  const check = (rec?: Record<string, string[]>) => {
    if (!rec) {
      return false
    }
    for (const role of PERMISSION_ROLES) {
      const arr = rec[role]
      if (Array.isArray(arr) && arr.length > 0) {
        return true
      }
    }
    return false
  }
  return check(add) || check(remove)
}

function deriveoverridesfromeffective(
  base: PERMISSION_CONFIG_NAME,
  eff: Record<string, Set<string>>,
): {
  add: Record<string, Set<string>>
  remove: Record<string, Set<string>>
} {
  const add = emptyoverridebyrole()
  const remove = emptyoverridebyrole()
  for (const role of PERMISSION_ROLES) {
    const pr = presetrolefamilies(base, role)
    const e = eff[role] ?? new Set()
    for (const f of e) {
      if (!pr.has(f)) {
        add[role].add(f)
      }
    }
    for (const f of pr) {
      if (!e.has(f)) {
        remove[role].add(f)
      }
    }
  }
  return { add, remove }
}

function sanitizerpermissionbase(raw: string): PERMISSION_CONFIG_NAME {
  if (raw === 'lockdown' || raw === 'creative') {
    return raw
  }
  return 'creative'
}

function recomputeallowlistbyrole() {
  const base = PERMISSION_STATE.permissionconfig
  for (const role of PERMISSION_ROLES) {
    const preset = presetrolefamilies(base, role)
    const add = PERMISSION_STATE.permissionoverrideadd[role] ?? new Set()
    const remove = PERMISSION_STATE.permissionoverrideremove[role] ?? new Set()
    const eff = new Set<string>()
    for (const f of preset) {
      if (!remove.has(f)) {
        eff.add(f)
      }
    }
    for (const f of add) {
      eff.add(f)
    }
    PERMISSION_STATE.allowlistbyrole[role] = eff
  }
}

function normalizeoverridesforrole(role: string) {
  const base = PERMISSION_STATE.permissionconfig
  const pr = presetrolefamilies(base, role)
  const add = PERMISSION_STATE.permissionoverrideadd[role]
  const remove = PERMISSION_STATE.permissionoverrideremove[role]
  if (!add || !remove) {
    return
  }
  for (const f of [...add]) {
    if (pr.has(f)) {
      add.delete(f)
    }
  }
  for (const f of [...remove]) {
    if (!pr.has(f)) {
      remove.delete(f)
    }
  }
}

const PERMISSION_STATE = {
  playertotoken: {} as Record<string, string>,
  rolebytoken: {} as Record<string, string>,
  bannedtokens: new Set<string>(),
  permissionconfig: 'creative' as PERMISSION_CONFIG_NAME,
  permissionoverrideadd: emptyoverridebyrole(),
  permissionoverrideremove: emptyoverridebyrole(),
  allowlistbyrole: {} as Record<string, Set<string>>,
}

recomputeallowlistbyrole()

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
    apierror(
      SOFTWARE,
      player,
      'permissions',
      'no token (deny)',
      `${family} - ${command}`,
    )
    return false
  }
  const tokenrole = PERMISSION_STATE.rolebytoken[token] ?? 'player'
  const allowlist = PERMISSION_STATE.allowlistbyrole[tokenrole]
  const allowed = allowlist?.has(family) ?? false
  if (!allowed) {
    apierror(
      SOFTWARE,
      player,
      'permissions',
      `(deny)`,
      `${family} - ${command}`,
    )
    return false
  }
  return true
}

export function memorysetplayertotoken(player: string, token: string) {
  if (isstring(player) && isstring(token)) {
    PERMISSION_STATE.playertotoken[player] = token
  }
}

/**
 * Restore permissions from storage / login payload.
 * Legacy `custom` + allowlist snapshots are migrated to base `lockdown` + overrides.
 * Empty allowlist payloads hydrate from the saved base preset.
 */
export function memorysetcommandpermissions(
  bannedtokens: string[],
  rolebytoken: Record<string, string>,
  permissionconfig: string,
  allowlistbyrole: Record<string, string[]>,
  allowlistbyrolecustom: Record<string, string[]>,
  permissionoverrideaddbyrole?: Record<string, string[]>,
  permissionoverrideremovebyrole?: Record<string, string[]>,
) {
  PERMISSION_STATE.bannedtokens = new Set(bannedtokens)
  PERMISSION_STATE.rolebytoken = deepcopy(rolebytoken)

  const raw = isstring(permissionconfig) ? permissionconfig : 'creative'
  let base: PERMISSION_CONFIG_NAME
  let add = emptyoverridebyrole()
  let remove = emptyoverridebyrole()

  if (
    hasanyoverrideentries(
      permissionoverrideaddbyrole,
      permissionoverrideremovebyrole,
    )
  ) {
    base = sanitizerpermissionbase(raw === 'custom' ? 'creative' : raw)
    add = recordtooverridesets(permissionoverrideaddbyrole)
    remove = recordtooverridesets(permissionoverrideremovebyrole)
  } else if (raw === 'custom') {
    const effsource = isallowlistmeaningful(allowlistbyrole)
      ? allowlistbyrole
      : allowlistbyrolecustom
    const eff = allowlistbyrolefrompreset(effsource)
    base = 'lockdown'
    const derived = deriveoverridesfromeffective('lockdown', eff)
    add = derived.add
    remove = derived.remove
  } else {
    base = sanitizerpermissionbase(raw)
    if (!isallowlistmeaningful(allowlistbyrole)) {
      /* overrides stay empty */
    } else {
      const eff = allowlistbyrolefrompreset(allowlistbyrole)
      const derived = deriveoverridesfromeffective(base, eff)
      add = derived.add
      remove = derived.remove
    }
  }

  PERMISSION_STATE.permissionconfig = base
  PERMISSION_STATE.permissionoverrideadd = add
  PERMISSION_STATE.permissionoverrideremove = remove
  recomputeallowlistbyrole()
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

/** Per-role breakdown: base grants, override grants, and families revoked vs base. */
export type PERMISSION_ALLOWLIST_BREAKDOWN = {
  effective: string[]
  frombase: string[]
  overridegrant: string[]
  overridedeny: string[]
}

export function memoryreadallowlistbreakdownbyrole(): Record<
  string,
  PERMISSION_ALLOWLIST_BREAKDOWN
> {
  const base = PERMISSION_STATE.permissionconfig
  const out: Record<string, PERMISSION_ALLOWLIST_BREAKDOWN> = {}
  for (const role of PERMISSION_ROLES) {
    const preset = presetrolefamilies(base, role)
    const add = PERMISSION_STATE.permissionoverrideadd[role] ?? new Set()
    const remove = PERMISSION_STATE.permissionoverrideremove[role] ?? new Set()
    const eff = PERMISSION_STATE.allowlistbyrole[role] ?? new Set()
    const frombase: string[] = []
    const overridegrant: string[] = []
    for (const f of [...eff].sort()) {
      if (add.has(f)) {
        overridegrant.push(f)
      } else if (preset.has(f) && !remove.has(f)) {
        frombase.push(f)
      } else if (!preset.has(f)) {
        overridegrant.push(f)
      }
    }
    out[role] = {
      effective: [...eff].sort(),
      frombase,
      overridegrant,
      overridedeny: [...remove].sort(),
    }
  }
  return out
}

export function memoryreadrolebytoken(): Record<string, string> {
  return { ...PERMISSION_STATE.rolebytoken }
}

export function memoryallowcommand(role: string, command: string): boolean {
  if (!PERMISSION_ROLES.includes(role)) {
    return false
  }
  const family = normalizetofamilyforallowlist(command)
  const base = PERMISSION_STATE.permissionconfig
  const pr = presetrolefamilies(base, role)
  const add = PERMISSION_STATE.permissionoverrideadd[role] ?? new Set()
  const remove = PERMISSION_STATE.permissionoverrideremove[role] ?? new Set()
  if (remove.has(family)) {
    remove.delete(family)
  } else if (!pr.has(family)) {
    add.add(family)
  }
  normalizeoverridesforrole(role)
  recomputeallowlistbyrole()
  return true
}

export function memoryrevokecommand(role: string, command: string): boolean {
  if (!PERMISSION_ROLES.includes(role)) {
    return false
  }
  const family = normalizetofamilyforallowlist(command)
  const base = PERMISSION_STATE.permissionconfig
  const pr = presetrolefamilies(base, role)
  const add = PERMISSION_STATE.permissionoverrideadd[role] ?? new Set()
  const remove = PERMISSION_STATE.permissionoverrideremove[role] ?? new Set()
  if (add.has(family)) {
    add.delete(family)
  } else if (pr.has(family)) {
    remove.add(family)
  }
  normalizeoverridesforrole(role)
  recomputeallowlistbyrole()
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

/** Set base preset; overrides unchanged; effective allowlist recomputed. */
export function memoryapplypermissionconfig(name: PERMISSION_CONFIG_NAME) {
  if (!PERMISSION_CONFIG_NAMES.includes(name)) {
    return
  }
  PERMISSION_STATE.permissionconfig = name
  recomputeallowlistbyrole()
}

/** Serialize for storage / registerstore. */
export function memoryserializepermissions(): {
  rolebytoken: Record<string, string>
  bannedtokens: string[]
  permissionconfig: PERMISSION_CONFIG_NAME
  allowlistbyrole: Record<string, string[]>
  allowlistbyrolecustom: Record<string, string[]>
  permissionoverrideaddbyrole: Record<string, string[]>
  permissionoverrideremovebyrole: Record<string, string[]>
} {
  return {
    rolebytoken: deepcopy(PERMISSION_STATE.rolebytoken),
    bannedtokens: memoryreadbannedtokens(),
    permissionconfig: deepcopy(PERMISSION_STATE.permissionconfig),
    allowlistbyrole: allowlistbyroletoserialized(
      PERMISSION_STATE.allowlistbyrole,
    ),
    allowlistbyrolecustom: {},
    permissionoverrideaddbyrole: allowlistbyroletoserialized(
      PERMISSION_STATE.permissionoverrideadd,
    ),
    permissionoverrideremovebyrole: allowlistbyroletoserialized(
      PERMISSION_STATE.permissionoverrideremove,
    ),
  }
}
