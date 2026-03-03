/**
 * Server-side platform: spawns simspace and heavyspace via child_process.fork.
 * Fork is used instead of worker_threads so the child processes can run with tsx (TypeScript).
 */
import { fork } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { MESSAGE } from '../device/api'
import {
  createforward,
  shouldforwardclienttoheavy,
  shouldforwardclienttoserver,
} from '../device/forward'

// Support both ESM (import.meta.url) and CJS/bundled (__dirname or process.argv[1])
const workerDir =
  typeof __dirname !== 'undefined'
    ? __dirname
    : typeof import.meta?.url === 'string'
      ? path.dirname(fileURLToPath(import.meta.url))
      : path.dirname(process.argv[1] || process.cwd())

let simProc: ReturnType<typeof fork> | undefined
let heavyProc: ReturnType<typeof fork> | undefined
let platformHalt: (() => void) | undefined

export function createplatformserver() {
  if (simProc || heavyProc) {
    return
  }

  const workerEnv = { ...process.env, ZSS_HEADLESS: '1' }

  const { forward, disconnect } = createforward((message) => {
    try {
      if (shouldforwardclienttoserver(message) && simProc?.connected) {
        simProc.send(message)
      }
      if (shouldforwardclienttoheavy(message) && heavyProc?.connected) {
        heavyProc.send(message)
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== 'ERR_IPC_CHANNEL_CLOSED') {
        console.error('platform forward:', err)
      }
    }
  })

  // Bundled: .js/.cjs/.mjs in same dir, or pkg exe (server[-target], simspace[-target], heavyspace[-target])
  const entry = process.argv[1] ?? process.execPath ?? ''
  const isBundled =
    entry.endsWith('.cjs') ||
    entry.endsWith('.mjs') ||
    (entry.endsWith('.js') && path.basename(entry).startsWith('server'))
  const isPkg = !!(process as NodeJS.Process & { pkg?: unknown }).pkg
  const ext = path.extname(entry)
  const bundleExt = ext === '.cjs' ? '.cjs' : ext === '.mjs' ? '.mjs' : '.js'
  const projectRoot = path.resolve(workerDir, '../..')
  const distSim = path.join(projectRoot, 'dist-server', 'simspace.js')
  const distHeavy = path.join(projectRoot, 'dist-server', 'heavyspace.js')
  const useDistWorkers =
    !isBundled && existsSync(distSim) && existsSync(distHeavy)
  let simWorker: string
  let heavyWorker: string
  if (isPkg) {
    const base = path.basename(entry, path.extname(entry))
    const ext = process.platform === 'win32' ? '.exe' : ''
    simWorker = path.join(workerDir, base.replace(/server/, 'simspace') + ext)
    heavyWorker = path.join(
      workerDir,
      base.replace(/server/, 'heavyspace') + ext,
    )
  } else if (isBundled || useDistWorkers) {
    const dir = isBundled ? workerDir : path.join(projectRoot, 'dist-server')
    const ext = isBundled ? bundleExt : '.js'
    simWorker = path.join(dir, `simspace${ext}`)
    heavyWorker = path.join(dir, `heavyspace${ext}`)
  } else {
    simWorker = path.join(workerDir, 'simspace.fork.ts')
    heavyWorker = path.join(workerDir, 'heavyspace.fork.ts')
  }

  const loaderPath = path.join(projectRoot, 'zss/server/loader.mjs')
  // Loader must run first to redirect maath/misc before tsx resolves it
  // --stack-size=4096 avoids overflow in deep gadget state / binarypack recursion
  // Prefer bundled workers when available (json-joy doesn't work with Node ESM in dev)
  const execArgv =
    isBundled || useDistWorkers
      ? ['--stack-size=4096']
      : [
          '--stack-size=4096',
          '--disable-warning=ExperimentalWarning',
          '--experimental-loader',
          loaderPath,
          '--import',
          'tsx',
        ]

  heavyProc = fork(heavyWorker, [], {
    env: workerEnv,
    execArgv,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  })

  simProc = fork(simWorker, [], {
    env: workerEnv,
    execArgv,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  })

  heavyProc.stdout?.on('data', (d) => process.stdout.write(`[heavy] ${d}`))
  heavyProc.stderr?.on('data', (d) => process.stderr.write(`[heavy] ${d}`))
  simProc.stdout?.on('data', (d) => process.stdout.write(`[sim] ${d}`))
  simProc.stderr?.on('data', (d) => process.stderr.write(`[sim] ${d}`))

  heavyProc.on('error', (err) => {
    console.error('heavyProc error:', err)
  })
  simProc.on('error', (err) => {
    console.error('simProc error:', err)
  })
  heavyProc.on('exit', (code) => {
    heavyProc = undefined
    if (code !== 0) {
      console.error('heavyProc exited with', code)
    }
  })
  simProc.on('exit', (code) => {
    simProc = undefined
    if (code !== 0) {
      console.error('simProc exited with', code)
    }
  })

  heavyProc.on('message', (message: MESSAGE) => {
    try {
      if (shouldforwardclienttoserver(message) && simProc?.connected) {
        simProc.send(message)
      }
      if (shouldforwardclienttoheavy(message) && heavyProc?.connected) {
        heavyProc.send(message)
      }
      forward(message)
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== 'ERR_IPC_CHANNEL_CLOSED') {
        const e = err as Error
        console.error(
          'platform heavy message:',
          e?.message ?? String(err),
          '\n  stack:',
          e?.stack ?? '(no stack)',
        )
        try {
          const target =
            typeof message === 'object' &&
            message !== null &&
            'target' in message
              ? String((message as { target?: string }).target)
              : '?'
          const msgPreview =
            typeof message === 'object' && message !== null
              ? JSON.stringify(message, (_, v) =>
                  typeof v === 'object' && v !== null ? '[object]' : v,
                ).slice(0, 500)
              : String(message).slice(0, 200)
          console.error('  target:', target, '| preview:', msgPreview)
        } catch {
          console.error('  message preview: (unserializable)')
        }
      }
    }
  })

  simProc.on('message', (message: MESSAGE) => {
    try {
      if (shouldforwardclienttoserver(message) && simProc?.connected) {
        simProc.send(message)
      }
      if (shouldforwardclienttoheavy(message) && heavyProc?.connected) {
        heavyProc.send(message)
      }
      forward(message)
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== 'ERR_IPC_CHANNEL_CLOSED') {
        const e = err as Error
        console.error(
          'platform sim message:',
          e?.message ?? String(err),
          '\n  stack:',
          e?.stack ?? '(no stack)',
        )
        try {
          const target =
            typeof message === 'object' &&
            message !== null &&
            'target' in message
              ? String((message as { target?: string }).target)
              : '?'
          const msgPreview =
            typeof message === 'object' && message !== null
              ? JSON.stringify(message, (_, v) =>
                  typeof v === 'object' && v !== null ? '[object]' : v,
                ).slice(0, 500)
              : String(message).slice(0, 200)
          console.error('  target:', target, '| preview:', msgPreview)
        } catch {
          console.error('  message preview: (unserializable)')
        }
      }
    }
  })

  platformHalt = () => {
    disconnect()
    heavyProc?.kill()
    heavyProc = undefined
    simProc?.kill()
    simProc = undefined
  }
}

export function haltplatformserver() {
  platformHalt?.()
  platformHalt = undefined
}
