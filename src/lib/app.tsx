/* eslint-disable @typescript-eslint/require-await */
/**
 * CLI app logic: runs the built cafe SPA in a Playwright webview.
 * Exposes Node bindings for logs, disk I/O (content, config, vars, history).
 * TypeScript + React Ink terminal UI.
 */
/* eslint-disable react-refresh/only-export-components -- CLI component lives with runApp */
import fs from 'fs'
import path from 'path'

import { Box, Text, render, useInput, useStdin } from 'ink'
import TextInput from 'ink-text-input'
import { chromium } from 'playwright'
import React, { useCallback, useEffect, useState } from 'react'

const MAX_HISTORY = 100

import { formatlogforterminal } from './formatlog.js'
import {
  createstaticserver,
  getbundledchromiumpath,
  getroot,
} from './server.js'

const root = getroot()
const distDir = path.join(root, 'cafe', 'dist')

const VITE_DEV_PORT = Number(process.env.ZSS_DEV_SERVER_PORT ?? '7777')

export type RunAppFlags = {
  port: number
  dev: boolean
  'data-dir': string
}

const logs: string[] = []
const logListeners = new Set<() => void>()

function addLog(line: string): void {
  if (!line?.trim()) {
    return
  }
  logs.push(line)
  logListeners.forEach((fn) => fn())
}

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

function ensureDataDir(dataDir: string): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
    addLog(`[JSON read] ${filePath}`)
    return data
  } catch {
    addLog(`[JSON read] ${filePath} (using default)`)
    return defaultValue
  }
}

function writeJsonFile(filePath: string, data: unknown, dataDir: string): void {
  ensureDataDir(dataDir)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  addLog(`[JSON write] ${filePath}`)
}

function CliApp({
  onInput,
}: {
  onInput: (line: string) => void
}): React.ReactElement {
  const { isRawModeSupported } = useStdin()
  const [logLines, setLogLines] = useState<string[]>(() => [...logs])
  const [value, setValue] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [, setHistoryIndex] = useState(-1)

  useEffect(() => {
    const tick = () => setLogLines([...logs])
    logListeners.add(tick)
    return () => {
      logListeners.delete(tick)
    }
  }, [])

  const commitline = useCallback(
    (line: string) => {
      if (line == null || line === undefined) {
        return
      }
      const trimmed = line.trim()
      if (trimmed !== '') {
        setHistory((prev) => {
          const next =
            prev[prev.length - 1] === trimmed ? prev : [...prev, trimmed]
          return next.slice(-MAX_HISTORY)
        })
      }
      setHistoryIndex(-1)
      onInput(line)
      setValue('')
    },
    [onInput],
  )

  useInput((_input, key) => {
    if (!isRawModeSupported || history.length === 0) {
      return
    }
    if (key.upArrow) {
      setHistoryIndex((prev) => {
        const idx = prev < 0 ? history.length - 1 : Math.max(0, prev - 1)
        setValue(history[idx])
        return idx
      })
    } else if (key.downArrow) {
      setHistoryIndex((prev) => {
        if (prev < 0) {
          return -1
        }
        const next = prev + 1
        if (next >= history.length) {
          setValue('')
          return -1
        }
        setValue(history[next])
        return next
      })
    }
  })

  return (
    <Box flexDirection="column" gap={0} padding={0}>
      <Box flexDirection="column" gap={0} padding={0}>
        {logLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Box flexShrink={0}>
        <Text color="magenta">zed.cafe{'>'}</Text>
        {isRawModeSupported ? (
          <TextInput
            value={value}
            onChange={(v) => {
              setHistoryIndex(-1)
              setValue(v)
            }}
            onSubmit={commitline}
            showCursor
          />
        ) : (
          <Text dimColor>(stdin not a TTY — run in a terminal for input)</Text>
        )}
      </Box>
    </Box>
  )
}

export async function runApp(flags: RunAppFlags): Promise<void> {
  const dataDir = path.resolve(flags['data-dir'])
  const port = flags.port
  const useDevServer = flags.dev

  let baseUrl: string
  if (useDevServer) {
    baseUrl = `http://localhost:${VITE_DEV_PORT}`
    addLog(`Using Vite dev server at ${baseUrl}`)
  } else {
    if (!fs.existsSync(distDir)) {
      console.error('cafe/dist not found. Run: yarn build')
      process.exit(1)
    }
    await createstaticserver(distDir, port)
    baseUrl = `http://localhost:${port}`
    addLog(`Serving cafe at ${baseUrl}`)
  }

  const executablePath = getbundledchromiumpath(root)
  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    })
  } catch (e: unknown) {
    const msg = (e as Error)?.message
    if (msg?.includes("Executable doesn't exist")) {
      console.error(
        'Playwright browsers not installed. Run: npx playwright install chromium',
      )
      process.exit(1)
    }
    throw e
  }

  addLog('Launching browser...')
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on('pageerror', (err) => {
    addLog(`Page error: ${err.message}`)
    if (err.stack) {
      addLog(err.stack)
    }
  })
  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'error' && !text.includes('favicon')) {
      addLog(`Console: ${text}`)
    }
  })

  await page.exposeFunction('__nodeLog', (line: string) => {
    addLog(formatlogforterminal(line))
  })

  let clipboardBuffer = ''
  await page.exposeFunction('__nodeClipboardRead', async () => clipboardBuffer)
  await page.exposeFunction('__nodeClipboardWrite', async (text: string) => {
    clipboardBuffer = text
  })

  await page.exposeFunction('__nodeStorageReadPlayer', async () => {
    const playerPath = path.join(dataDir, 'player.json')
    const existing = readJsonFile<{ playerId?: string }>(playerPath, {})
    if (existing?.playerId) {
      return existing.playerId
    }
    const playerId = process.env.ZSS_PLAYER_ID ?? createpid()
    writeJsonFile(playerPath, { playerId }, dataDir)
    return playerId
  })

  const stubBookPath = path.join(root, 'src', 'stub-book.json')
  const stubBookData = readJsonFile<unknown[]>(stubBookPath, [])

  await page.exposeFunction('__nodeStorageReadContent', (player: string) => {
    const contentPath = path.join(dataDir, `${player}.json`)
    const data = readJsonFile<unknown[]>(contentPath, stubBookData)
    return JSON.stringify(data)
  })

  await page.exposeFunction(
    '__nodeStorageWriteContent',
    async (
      player: string,
      _label: string,
      _longcontent: string,
      _compressed: string,
      books: any[],
    ) => {
      writeJsonFile(path.join(dataDir, `${player}.json`), books, dataDir)
    },
  )

  const configPath = path.join(dataDir, 'config.json')
  await page.exposeFunction('__nodeStorageReadConfig', async (name: string) => {
    const config = readJsonFile<Record<string, string>>(configPath, {})
    return config[`config_${name}`] || (name === 'crt' ? 'on' : 'off')
  })

  await page.exposeFunction(
    '__nodeStorageWriteConfig',
    async (name: string, value: string) => {
      const config = readJsonFile<Record<string, string>>(configPath, {})
      config[`config_${name}`] = value
      writeJsonFile(configPath, config, dataDir)
    },
  )

  const configKeys = [
    'config_crt',
    'config_lowrez',
    'config_scanlines',
    'config_voice2text',
    'config_loaderlogging',
    'config_promptlogging',
  ]
  await page.exposeFunction('__nodeStorageReadConfigAll', async () => {
    const config = readJsonFile<Record<string, string>>(configPath, {})
    return configKeys.map((key) => {
      const keyname = key.replace('config_', '')
      const value = config[key]
      const normalized = value && value !== 'off' ? 'on' : 'off'
      return [
        keyname,
        value ? normalized : keyname === 'crt' ? 'on' : 'off',
      ] as [string, string]
    })
  })

  const varsPath = path.join(dataDir, 'vars.json')
  await page.exposeFunction('__nodeStorageReadVars', async () =>
    readJsonFile<Record<string, unknown>>(varsPath, {}),
  )

  await page.exposeFunction(
    '__nodeStorageWriteVar',
    async (name: string, value: unknown) => {
      const vars = readJsonFile<Record<string, unknown>>(varsPath, {})
      vars[name] = value
      writeJsonFile(varsPath, vars, dataDir)
    },
  )

  const historyPath = path.join(dataDir, 'history.json')
  await page.exposeFunction('__nodeStorageReadHistoryBuffer', async () => {
    const data = readJsonFile<{ buffer?: unknown[] }>(historyPath, {
      buffer: [],
    })
    return Array.isArray(data.buffer) ? data.buffer : []
  })

  await page.exposeFunction(
    '__nodeStorageWriteHistoryBuffer',
    async (buf: unknown[]) => {
      writeJsonFile(historyPath, { buffer: buf }, dataDir)
    },
  )

  await page.exposeFunction('__nodeStorageNukeContent', () => {
    try {
      for (const file of fs.readdirSync(dataDir)) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(dataDir, file))
        }
      }
    } catch {
      /* ignore */
    }
    process.exit(0)
  })

  let resolveReady: () => void
  const readyPromise = new Promise<void>((r) => {
    resolveReady = r
  })
  await page.exposeFunction('__nodeReady', () => resolveReady())

  addLog('Loading app (this may take a moment)...')
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 60000 })

  addLog('Waiting for app ready...')
  const readyTimeout = setTimeout(
    () => addLog('Still waiting for app (WebGL/Engine may be loading)...'),
    15000,
  )
  await readyPromise
  clearTimeout(readyTimeout)
  addLog('Ready. Type commands (e.g. #help) and press Enter:')

  render(
    <CliApp
      onInput={(line) => {
        if (line == null) {
          return
        }
        page
          .evaluate((l: string) => {
            ;(
              window as unknown as { __onCliInput?: (s: string) => void }
            ).__onCliInput?.(l)
          }, line)
          .catch((err) => addLog(String(err)))
      }}
    />,
  )
}
