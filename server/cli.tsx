#!/usr/bin/env node
/**
 * CLI server: runs the built cafe SPA in a Playwright webview.
 * Exposes Node bindings for logs, disk I/O (content, config, vars, history).
 * TypeScript + React Ink terminal UI.
 */
import fs from 'fs'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const isPkgSnapshot = (p: string) => p.startsWith('/snapshot/') || p.includes(path.sep + 'snapshot' + path.sep)

function copyDirSync(source: string, target: string, executablePattern?: RegExp): void {
  fs.mkdirSync(target, { recursive: true })
  for (const name of fs.readdirSync(source)) {
    const src = path.join(source, name)
    const dst = path.join(target, name)
    if (fs.statSync(src).isDirectory()) {
      copyDirSync(src, dst, executablePattern)
    } else {
      fs.copyFileSync(src, dst)
      if (executablePattern?.test(name)) fs.chmodSync(dst, 0o755)
    }
  }
}

import { Box, Text, render } from 'ink'
import TextInput from 'ink-text-input'
import { chromium } from 'playwright'
import React, { useEffect, useState } from 'react'

import { formatLogForTerminal } from './format-log'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const distDir = path.join(root, 'cafe', 'dist')
const defaultDataDir = path.join(process.cwd(), '.zss-data')

/** Resolve path to bundled Chromium headless shell (when built with pkg). */
function getBundledChromiumPath(): string | null {
  const browsersDir = path.join(root, 'node_modules', 'playwright-core', '.local-browsers')
  if (!fs.existsSync(browsersDir)) return null
  const entries = fs.readdirSync(browsersDir)
  const shellDir = entries.find((e) => e.startsWith('chromium_headless_shell-'))
  if (!shellDir) return null
  const platform =
    process.platform === 'darwin'
      ? process.arch === 'arm64'
        ? 'chrome-headless-shell-mac-arm64'
        : 'chrome-headless-shell-mac-x64'
      : process.platform === 'win32'
        ? 'chrome-headless-shell-win64'
        : `chrome-headless-shell-linux-${process.arch}`
  const exeName = process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell'
  const sourceExePath = path.join(browsersDir, shellDir, platform, exeName)
  if (!fs.existsSync(sourceExePath)) return null

  // When running as pkg binary, the browser is inside the snapshot and cannot be exec'd.
  // Extract to a temp dir next to the binary (copyFileSync works with pkg snapshot; cpSync may not).
  if (isPkgSnapshot(sourceExePath)) {
    const extractDir = path.join(path.dirname(process.execPath), '.zss-chromium')
    const targetPlatformDir = path.join(extractDir, shellDir, platform)
    const targetExePath = path.join(targetPlatformDir, exeName)
    if (!fs.existsSync(targetExePath)) {
      const sourcePlatformDir = path.join(browsersDir, shellDir, platform)
      const exePattern = process.platform === 'win32' ? /\.exe$/i : /^chrome-headless-shell$/i
      copyDirSync(sourcePlatformDir, targetPlatformDir, exePattern)
    }
    fs.chmodSync(targetExePath, 0o755)
    return targetExePath
  }

  return sourceExePath
}

const dataDir = process.env.ZSS_DATA_DIR ?? defaultDataDir

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

function ensureDataDir(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  ensureDataDir()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

// Shared log buffer and emitter for Ink UI
const logs: string[] = []
const logListeners = new Set<() => void>()

function addLog(line: string): void {
  if (!line || !line.trim()) return
  logs.push(line)
  logListeners.forEach((fn) => fn())
}

// Static file server for cafe/dist
function createStaticServer(
  port: number,
): Promise<ReturnType<typeof createServer>> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let urlPath = req.url === '/' ? '/index.html' : (req.url ?? '/')
      urlPath = urlPath.split('?')[0]
      const filePath = path.join(distDir, urlPath)
      if (!filePath.startsWith(distDir)) {
        res.writeHead(403)
        res.end()
        return
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            fs.readFile(path.join(distDir, 'index.html'), (e, fallback) => {
              if (e) {
                res.writeHead(404)
                res.end()
                return
              }
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(fallback)
            })
          } else {
            res.writeHead(500)
            res.end()
          }
          return
        }
        const ext = path.extname(filePath)
        const types: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.ico': 'image/x-icon',
          '.wasm': 'application/wasm',
          '.webmanifest': 'application/manifest+json',
        }
        res.writeHead(200, {
          'Content-Type': types[ext] || 'application/octet-stream',
        })
        res.end(data)
      })
    })
    server.listen(port, () => resolve(server))
  })
}

type CliAppProps = {
  onInput: (line: string) => void
}

function CliApp({ onInput }: CliAppProps): React.ReactElement {
  const [logLines, setLogLines] = useState<string[]>(() => [...logs])
  const [value, setValue] = useState('')

  useEffect(() => {
    const tick = () => setLogLines([...logs])
    logListeners.add(tick)
    return () => {
      logListeners.delete(tick)
    }
  }, [])

  return (
    <Box flexDirection="column" gap={0} padding={0}>
      <Box flexDirection="column" gap={0} padding={0}>
        {logLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Box flexShrink={0}>
        <Text color="magenta">zed.cafe{'>'}</Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={(v) => {
            if (v != null && v !== undefined) {
              onInput(v)
              setValue('')
            }
          }}
          showCursor
        />
      </Box>
    </Box>
  )
}

async function main(): Promise<void> {
  if (!fs.existsSync(distDir)) {
    console.error('cafe/dist not found. Run: yarn build')
    process.exit(1)
  }

  const port = parseInt(process.env.ZSS_SERVER_PORT ?? '7778', 10)
  await createStaticServer(port)
  const baseUrl = `http://localhost:${port}`
  addLog(`Serving cafe at ${baseUrl}`)

  const executablePath = getBundledChromiumPath()
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

  // Expose bindings before navigation
  await page.exposeFunction('__nodeLog', (line: string) => {
    addLog(formatLogForTerminal(line))
  })

  let clipboardBuffer = ''
  await page.exposeFunction('__nodeClipboardRead', async () => clipboardBuffer)
  await page.exposeFunction(
    '__nodeClipboardWrite',
    async (text: string) => {
      clipboardBuffer = text
    },
  )

  // eslint-disable-next-line @typescript-eslint/require-await
  await page.exposeFunction('__nodeStorageReadPlayer', async () => {
    const playerPath = path.join(dataDir, 'player.json')
    const existing = readJsonFile<{ playerId?: string }>(playerPath, {})
    if (existing?.playerId) {
      return existing.playerId
    }
    const playerId = process.env.ZSS_PLAYER_ID ?? createpid()
    writeJsonFile(playerPath, { playerId })
    return playerId
  })

  const stubBookPath = path.join(root, 'server', 'stub-book.json')
  const stubBookJson = fs.readFileSync(stubBookPath, 'utf8')

  await page.exposeFunction('__nodeStorageReadContent', (player: string) => {
    const contentPath = path.join(dataDir, `${player}.json`)
    try {
      return fs.readFileSync(contentPath, 'utf8')
    } catch {
      return stubBookJson
    }
  })

  await page.exposeFunction(
    '__nodeStorageWriteContent',
    async (
      player: string,
      _label: string,
      _longcontent: string,
      compressed: string,
      _books: unknown[],
    ) => {
      ensureDataDir()
      const contentPath = path.join(dataDir, `${player}.json`)
      fs.writeFileSync(contentPath, compressed, 'utf8')
    },
  )

  const configPath = path.join(dataDir, 'config.json')
  await page.exposeFunction('__nodeStorageReadConfig', async (name: string) => {
    const config = readJsonFile<Record<string, string>>(configPath, {})
    const key = `config_${name}`
    return config[key] || (name === 'crt' ? 'on' : 'off')
  })

  await page.exposeFunction(
    '__nodeStorageWriteConfig',
    async (name: string, value: string) => {
      const config = readJsonFile<Record<string, string>>(configPath, {})
      config[`config_${name}`] = value
      writeJsonFile(configPath, config)
    },
  )

  const configKeys = [
    'config_crt',
    'config_lowrez',
    'config_scanlines',
    'config_voice2text',
    'config_loaderlogging',
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
  await page.exposeFunction('__nodeStorageReadVars', async () => {
    return readJsonFile<Record<string, unknown>>(varsPath, {})
  })

  await page.exposeFunction(
    '__nodeStorageWriteVar',
    async (name: string, value: unknown) => {
      const vars = readJsonFile<Record<string, unknown>>(varsPath, {})
      vars[name] = value
      writeJsonFile(varsPath, vars)
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
      writeJsonFile(historyPath, { buffer: buf })
    },
  )

  await page.exposeFunction('__nodeStorageNukeContent', () => {
    try {
      const files = fs.readdirSync(dataDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(dataDir, file))
        }
      }
    } catch {
      // ignore
    }
    process.exit(0)
  })

  let resolveReady: () => void
  const readyPromise = new Promise<void>((r) => {
    resolveReady = r
  })
  await page.exposeFunction('__nodeReady', () => {
    resolveReady()
  })

  addLog('Loading app (this may take a moment)...')
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 60000 })

  addLog('Waiting for app ready...')
  const readyTimeout = setTimeout(() => {
    addLog('Still waiting for app (WebGL/Engine may be loading)...')
  }, 15000)
  await readyPromise
  clearTimeout(readyTimeout)
  addLog('Ready. Type commands (e.g. #help) and press Enter:')

  render(
    <CliApp
      onInput={async (line) => {
        if (line == null) {
          return
        }
        try {
          await page.evaluate((l: string) => {
            ;(
              window as unknown as { __onCliInput?: (s: string) => void }
            ).__onCliInput?.(l)
          }, line)
        } catch (err) {
          addLog(String(err))
        }
      }}
    />,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
