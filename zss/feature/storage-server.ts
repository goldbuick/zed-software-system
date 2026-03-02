/**
 * Server-side storage: filesystem-backed storage for Node.js.
 * Config: ~/.zss/config.json or ./.zss/config.json
 * Content: ~/.zss/content/ or env ZSS_CONTENT_DIR
 */
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

import { BOOK } from 'zss/memory/types'

const DEFAULT_CONFIG_DIR =
  process.env.ZSS_CONFIG_DIR ??
  path.join(process.env.HOME ?? os.homedir(), '.zss')
const CONTENT_DIR =
  process.env.ZSS_CONTENT_DIR ?? path.join(DEFAULT_CONFIG_DIR, 'content')
const FILE_SOURCE = 'zss-content.json'
const CONFIG_FILE = path.join(DEFAULT_CONFIG_DIR, 'config.json')
const STORAGE_FILE = path.join(DEFAULT_CONFIG_DIR, 'storage.json')
const HISTORY_FILE = path.join(DEFAULT_CONFIG_DIR, 'history.json')
const SESSION_FILE = path.join(DEFAULT_CONFIG_DIR, 'session.json')
const NETID_FILE = path.join(DEFAULT_CONFIG_DIR, 'netid')

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function readJsonFile<T>(file: string): Promise<T | undefined> {
  try {
    const data = await fs.readFile(file, 'utf-8')
    return JSON.parse(data) as T
  } catch {
    return undefined
  }
}

async function writeJsonFile<T>(file: string, data: T) {
  await ensureDir(path.dirname(file))
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8')
}

export function storagereadconfigdefault(name: string) {
  switch (name) {
    case 'crt':
      return 'on'
    default:
      return 'off'
  }
}

export async function storagereadconfig(name: string) {
  const config = await readJsonFile<Record<string, string>>(CONFIG_FILE)
  const value = config?.[`config_${name}`]
  if (!value) {
    return storagereadconfigdefault(name)
  }
  return value && value !== 'off' ? 'on' : 'off'
}

export async function storagewriteconfig(name: string, value: string) {
  const config = (await readJsonFile<Record<string, string>>(CONFIG_FILE)) ?? {}
  config[`config_${name}`] = value
  await writeJsonFile(CONFIG_FILE, config)
}

export async function storagereadconfigall() {
  const lookup = [
    'crt',
    'lowrez',
    'scanlines',
    'voice2text',
    'loaderlogging',
  ] as const
  const config = await readJsonFile<Record<string, string>>(CONFIG_FILE)
  return lookup.map((keyname) => {
    const value = config?.[`config_${keyname}`]
    if (!value) {
      return [keyname, storagereadconfigdefault(keyname)]
    }
    return [keyname, value && value !== 'off' ? 'on' : 'off']
  })
}

export async function storagereadhistorybuffer() {
  const data = await readJsonFile<{ buffer?: string[] }>(HISTORY_FILE)
  return data?.buffer ?? undefined
}

export async function storagewritehistorybuffer(historybuffer: string[]) {
  await writeJsonFile(HISTORY_FILE, { buffer: historybuffer })
}

export async function storagereadcontent(
  _player: string, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<string | BOOK[]> {
  const contentFile = path.join(CONTENT_DIR, FILE_SOURCE)
  try {
    const data = await fs.readFile(contentFile, 'utf-8')
    return JSON.parse(data) as BOOK[]
  } catch {
    return []
  }
}

export async function storagewritecontent(
  _player: string,
  _label: string,
  _longcontent: string,
  _compressed: string,
  books: BOOK[],
) {
  const contentFile = path.join(CONTENT_DIR, FILE_SOURCE)
  await ensureDir(CONTENT_DIR)
  await writeJsonFile(contentFile, books)
}

export async function storagereadvars(): Promise<Record<string, any>> {
  const storage = await readJsonFile<Record<string, any>>(STORAGE_FILE)
  return storage ?? {}
}

export async function storagewritevar(name: string, value: any) {
  const storage = await storagereadvars()
  storage[name] = value
  await writeJsonFile(STORAGE_FILE, storage)
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export async function storagewatchcontent(_player: string) {
  // No-op in server: no hashchange, content is file-based
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export async function storagesharecontent(_player: string) {
  // No-op or print join URL
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export async function storagenukecontent(_player: string): Promise<void> {
  const contentFile = path.join(CONTENT_DIR, FILE_SOURCE)
  try {
    await fs.unlink(contentFile)
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      throw err
    }
  }
}

/** Server-only: read player ID from session file */
export async function storagereadplayer(): Promise<string | undefined> {
  const session = await readJsonFile<{ player?: string }>(SESSION_FILE)
  return session?.player
}

/** Server-only: write player ID to session file */
export async function storagewriteplayer(player: string) {
  await writeJsonFile(SESSION_FILE, { player })
}

/** Server-only: read peer ID for netterminal */
export async function storagereadnetid(): Promise<string | undefined> {
  try {
    const data = await fs.readFile(NETID_FILE, 'utf-8')
    return data.trim()
  } catch {
    return undefined
  }
}

/** Server-only: write peer ID for netterminal */
export async function storagewritenetid(netid: string) {
  await ensureDir(DEFAULT_CONFIG_DIR)
  await fs.writeFile(NETID_FILE, netid, 'utf-8')
}
