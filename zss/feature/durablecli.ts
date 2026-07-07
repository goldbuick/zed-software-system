import {
  durabledel,
  durableentries,
  durableget,
  durablegetmany,
  durableset,
  durablesetmany,
  durableupdate,
} from 'zss/feature/durable'
import { isclimode } from 'zss/feature/detect'
import { CONFIG_KEYS, CONFIG_STRING_KEYS } from 'zss/feature/storagekeys'

const CLI_SYNC_INTERVAL_MS = 2000
const SYSTEM_JSON_FILENAME = 'system.json'

/** IDB keys always included in CLI disk snapshot (never shorturl). */
const KNOWN_DURABLE_KEY_PREFIXES = ['config_'] as const

const KNOWN_DURABLE_KEYS = new Set([
  'storage',
  'HISTORYBUFFER',
  'netid',
  'znsemail',
  'znstoken',
  'znsnamespace',
  'bridge_profiles_v1',
  'secretheap',
  'findanyconfig',
  'styleconfig',
  'remixconfig',
])

const CONFIG_KEY_SET = new Set<string>(CONFIG_KEYS)
const CONFIG_STRING_KEY_SET = new Set<string>(CONFIG_STRING_KEYS)

type NODE_DURABLE_GLOBAL = {
  __nodeDurableReadSnapshot?: () => Promise<Record<string, unknown>>
  __nodeDurableWriteSnapshot?: (
    snapshot: Record<string, unknown>,
  ) => Promise<void>
  __nodeStorageReadConfig?: (name: string) => Promise<string>
  __nodeStorageReadConfigAll?: () => Promise<[string, string][]>
  __nodeStorageReadVars?: () => Promise<Record<string, unknown>>
  __nodeStorageReadHistoryBuffer?: () => Promise<string[]>
}

function readnodeglobal(): NODE_DURABLE_GLOBAL {
  return globalThis as NODE_DURABLE_GLOBAL
}

export function isdurableshorturlkey(key: string, value?: unknown): boolean {
  if (KNOWN_DURABLE_KEYS.has(key)) {
    return false
  }
  for (const prefix of KNOWN_DURABLE_KEY_PREFIXES) {
    if (key.startsWith(prefix)) {
      return false
    }
  }
  if (
    key.startsWith('http://') ||
    key.startsWith('https://') ||
    key.startsWith('#')
  ) {
    return true
  }
  if (typeof value === 'string') {
    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('#')
    ) {
      return true
    }
  }
  if (key.includes('-') && key.includes(' ')) {
    return true
  }
  return false
}

function filtersnapshotentries(
  rows: [string, unknown][],
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {}
  for (const [key, value] of rows) {
    if (!isdurableshorturlkey(key, value)) {
      snapshot[key] = value
    }
  }
  return snapshot
}

async function readlegacyconfigentries(): Promise<[string, unknown][]> {
  const g = readnodeglobal()
  if (typeof g.__nodeStorageReadConfigAll !== 'function') {
    return []
  }
  const rows = await g.__nodeStorageReadConfigAll()
  return rows.map(([name, value]) => [`config_${name}`, value])
}

async function readlegacyvarsentries(): Promise<[string, unknown][]> {
  const g = readnodeglobal()
  if (typeof g.__nodeStorageReadVars !== 'function') {
    return []
  }
  const vars = await g.__nodeStorageReadVars()
  const configentries: [string, unknown][] = []
  const storageblob: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(vars ?? {})) {
    if (CONFIG_KEY_SET.has(key) || CONFIG_STRING_KEY_SET.has(key)) {
      configentries.push([`config_${key}`, value])
    } else {
      storageblob[key] = value
    }
  }
  const entrieslist: [string, unknown][] = [...configentries]
  if (Object.keys(storageblob).length > 0) {
    entrieslist.push(['storage', storageblob])
  }
  return entrieslist
}

async function readlegacyhistoryentry(): Promise<[string, unknown] | undefined> {
  const g = readnodeglobal()
  if (typeof g.__nodeStorageReadHistoryBuffer !== 'function') {
    return undefined
  }
  const buffer = await g.__nodeStorageReadHistoryBuffer()
  return ['HISTORYBUFFER', buffer]
}

async function readlegacysnapshotentries(): Promise<[string, unknown][]> {
  const configrows = await readlegacyconfigentries()
  const varsrows = await readlegacyvarsentries()
  const history = await readlegacyhistoryentry()
  const rows = [...configrows, ...varsrows]
  if (history) {
    rows.push(history)
  }
  return rows
}

export async function durablehydratefromdisk(): Promise<void> {
  if (!isclimode()) {
    return
  }
  const g = readnodeglobal()
  let rows: [string, unknown][] = []
  if (typeof g.__nodeDurableReadSnapshot === 'function') {
    const snapshot = await g.__nodeDurableReadSnapshot()
    rows = Object.entries(snapshot ?? {})
  }
  if (rows.length === 0) {
    rows = await readlegacysnapshotentries()
  }
  if (rows.length > 0) {
    await durablesetmany(rows)
  }
}

export async function durableflushtodisk(): Promise<void> {
  if (!isclimode()) {
    return
  }
  const g = readnodeglobal()
  if (typeof g.__nodeDurableWriteSnapshot !== 'function') {
    return
  }
  const rows = await durableentries()
  const snapshot = filtersnapshotentries(rows)
  await g.__nodeDurableWriteSnapshot(snapshot)
}

export function startdurableclisync(): () => void {
  if (!isclimode()) {
    return () => {}
  }
  const flush = () => {
    void durableflushtodisk()
  }
  const interval = setInterval(flush, CLI_SYNC_INTERVAL_MS)
  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('beforeunload', flush)
  }
  return () => {
    clearInterval(interval)
    if (typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('beforeunload', flush)
    }
  }
}

export { SYSTEM_JSON_FILENAME }
