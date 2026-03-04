/**
 * Storage bridge for headless browser mode.
 * Delegates to window.__nodeStorage* functions wired by Node via page.exposeFunction.
 * Use when loading the web build in a headless browser controlled by the server.
 */

import { BOOK } from 'zss/memory/types'

declare global {
  interface Window {
    __nodeStorageReadPlayer?: () => Promise<string | undefined>
    __nodeStorageWritePlayer?: (player: string) => Promise<void>
    __nodeStorageReadNetId?: () => Promise<string | undefined>
    __nodeStorageWriteNetId?: (netid: string) => Promise<void>
    __nodeStorageReadConfig?: (name: string) => Promise<string>
    __nodeStorageWriteConfig?: (name: string, value: string) => Promise<void>
    __nodeStorageReadConfigAll?: () => Promise<[string, string][]>
    __nodeStorageReadHistoryBuffer?: () => Promise<string[] | undefined>
    __nodeStorageWriteHistoryBuffer?: (buffer: string[]) => Promise<void>
    __nodeStorageReadContent?: (player: string) => Promise<string | BOOK[]>
    __nodeStorageWriteContent?: (
      player: string,
      label: string,
      longcontent: string,
      compressed: string,
      books: BOOK[],
    ) => Promise<void>
    __nodeStorageReadVars?: () => Promise<Record<string, unknown>>
    __nodeStorageWriteVar?: (name: string, value: unknown) => Promise<void>
    __nodeStorageNukeContent?: (player: string) => Promise<void>
  }
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
  const fn = window.__nodeStorageReadConfig
  if (!fn) {
    return storagereadconfigdefault(name)
  }
  const value = await fn(name)
  return value && value !== 'off' ? 'on' : 'off'
}

export async function storagewriteconfig(name: string, value: string) {
  const fn = window.__nodeStorageWriteConfig
  if (fn) {
    await fn(name, value)
  }
}

export async function storagereadconfigall() {
  const fn = window.__nodeStorageReadConfigAll
  if (!fn) {
    return [
      ['crt', storagereadconfigdefault('crt')],
      ['lowrez', 'off'],
      ['scanlines', 'off'],
      ['voice2text', 'off'],
      ['loaderlogging', 'off'],
    ]
  }
  return fn()
}

export async function storagereadhistorybuffer() {
  const fn = window.__nodeStorageReadHistoryBuffer
  return fn ? fn() : undefined
}

export async function storagewritehistorybuffer(historybuffer: string[]) {
  const fn = window.__nodeStorageWriteHistoryBuffer
  if (fn) {
    await fn(historybuffer)
  }
}

export async function storagereadcontent(player: string): Promise<string | BOOK[]> {
  const fn = window.__nodeStorageReadContent
  if (!fn) {
    return ''
  }
  return fn(player)
}

export async function storagewritecontent(
  player: string,
  label: string,
  longcontent: string,
  compressed: string,
  books: BOOK[],
) {
  const fn = window.__nodeStorageWriteContent
  if (fn) {
    await fn(player, label, longcontent, compressed, books)
  }
}

export async function storagereadvars(): Promise<Record<string, unknown>> {
  const fn = window.__nodeStorageReadVars
  return fn ? fn() : {}
}

export async function storagewritevar(name: string, value: unknown) {
  const fn = window.__nodeStorageWriteVar
  if (fn) {
    await fn(name, value)
  }
}

export async function storagewatchcontent(_player: string) {
  // No-op in headless: content is file-based, no hashchange
}

export async function storagesharecontent(_player: string) {
  // No-op in headless
}

export async function storagenukecontent(player: string) {
  const fn = window.__nodeStorageNukeContent
  if (fn) {
    await fn(player)
  }
}

export async function storagereadplayer(): Promise<string | undefined> {
  const fn = window.__nodeStorageReadPlayer
  return fn ? fn() : undefined
}

export async function storagewriteplayer(player: string) {
  const fn = window.__nodeStorageWritePlayer
  if (fn) {
    await fn(player)
  }
}

export async function storagereadnetid(): Promise<string | undefined> {
  const fn = window.__nodeStorageReadNetId
  return fn ? fn() : undefined
}

export async function storagewritenetid(netid: string) {
  const fn = window.__nodeStorageWriteNetId
  if (fn) {
    await fn(netid)
  }
}
