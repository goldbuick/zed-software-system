/* eslint-disable @typescript-eslint/require-await */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Page } from '@playwright/test'

import { readcoolregionsbowbooks } from '../../zss/testsupport/coolregionsbowbook'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')

function createpid(): string {
  const numbers = '0123456789'
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
  const rnd = (n: number, set: string) => {
    let s = ''
    for (let i = 0; i < n; i++) {
      s += set[Math.floor(Math.random() * set.length)]
    }
    return s
  }
  return `pid_${rnd(4, numbers)}_${rnd(16, chars)}`
}

function readjsonfile<T>(filepath: string, defaultvalue: T): T {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8')) as T
  } catch {
    return defaultvalue
  }
}

function writejsonfile(filepath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filepath), { recursive: true })
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8')
}

/** CLI-style Node storage hooks for headless host tabs in Playwright. */
export async function exposehoststorage(
  page: Page,
  datadir: string,
): Promise<void> {
  fs.mkdirSync(datadir, { recursive: true })
  const stubbook = readcoolregionsbowbooks()
  const configpath = path.join(datadir, 'config.json')
  const varspath = path.join(datadir, 'vars.json')
  const historypath = path.join(datadir, 'history.json')
  const configkeys = [
    'config_crt',
    'config_lowrez',
    'config_scanlines',
    'config_voice2text',
    'config_loaderlogging',
    'config_promptlogging',
    'config_dev',
    'config_gadget',
  ]

  await page.exposeFunction('__nodeStorageReadPlayer', async () => {
    const playerpath = path.join(datadir, 'player.json')
    const existing = readjsonfile<{ playerId?: string }>(playerpath, {})
    if (existing?.playerId) {
      return existing.playerId
    }
    const playerid = process.env.ZSS_PLAYER_ID ?? createpid()
    writejsonfile(playerpath, { playerId: playerid })
    return playerid
  })

  await page.exposeFunction('__nodeStorageReadContent', (player: string) => {
    const contentpath = path.join(datadir, `${player}.json`)
    const data = readjsonfile<unknown[]>(contentpath, stubbook)
    return JSON.stringify(data)
  })

  await page.exposeFunction(
    '__nodeStorageWriteContent',
    async (
      player: string,
      _label: string,
      _longcontent: string,
      _compressed: string,
      books: unknown[],
    ) => {
      writejsonfile(path.join(datadir, `${player}.json`), books)
    },
  )

  await page.exposeFunction('__nodeStorageReadConfig', async (name: string) => {
    const config = readjsonfile<Record<string, string>>(configpath, {})
    return config[`config_${name}`] || (name === 'crt' ? 'on' : 'off')
  })

  await page.exposeFunction(
    '__nodeStorageWriteConfig',
    async (name: string, value: string) => {
      const config = readjsonfile<Record<string, string>>(configpath, {})
      config[`config_${name}`] = value
      writejsonfile(configpath, config)
    },
  )

  await page.exposeFunction('__nodeStorageReadConfigAll', async () => {
    const config = readjsonfile<Record<string, string>>(configpath, {})
    return configkeys.map((key) => {
      const keyname = key.replace('config_', '')
      const value = config[key]
      const normalized = value && value !== 'off' ? 'on' : 'off'
      return [
        keyname,
        value ? normalized : keyname === 'crt' ? 'on' : 'off',
      ] as [string, string]
    })
  })

  await page.exposeFunction('__nodeStorageReadVars', async () =>
    readjsonfile<Record<string, unknown>>(varspath, {}),
  )

  await page.exposeFunction(
    '__nodeStorageWriteVar',
    async (name: string, value: unknown) => {
      const vars = readjsonfile<Record<string, unknown>>(varspath, {})
      vars[name] = value
      writejsonfile(varspath, vars)
    },
  )

  await page.exposeFunction('__nodeStorageReadHistoryBuffer', async () => {
    const data = readjsonfile<{ buffer?: unknown[] }>(historypath, {
      buffer: [],
    })
    return Array.isArray(data.buffer) ? data.buffer : []
  })

  await page.exposeFunction(
    '__nodeStorageWriteHistoryBuffer',
    async (buf: unknown[]) => {
      writejsonfile(historypath, { buffer: buf })
    },
  )
}
