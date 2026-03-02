/**
 * Server-side platform: spawns simspace and heavyspace via child_process.fork.
 * Fork is used instead of worker_threads so the child processes can run with tsx (TypeScript).
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { fork } from 'child_process'

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
    if (shouldforwardclienttoserver(message) && simProc) {
      simProc.send(message)
    }
    if (shouldforwardclienttoheavy(message) && heavyProc) {
      heavyProc.send(message)
    }
  })

  // Bundled: .cjs in same dir, or pkg exe (server[-target], simspace[-target], heavyspace[-target])
  const entry = process.argv[1] ?? process.execPath ?? ''
  const isBundled = entry.endsWith('.cjs')
  const isPkg = !!(process as NodeJS.Process & { pkg?: unknown }).pkg
  let simWorker: string
  let heavyWorker: string
  if (isPkg) {
    const base = path.basename(entry, path.extname(entry))
    const ext = process.platform === 'win32' ? '.exe' : ''
    simWorker = path.join(workerDir, base.replace(/server/, 'simspace') + ext)
    heavyWorker = path.join(workerDir, base.replace(/server/, 'heavyspace') + ext)
  } else if (isBundled) {
    simWorker = path.join(workerDir, 'simspace.cjs')
    heavyWorker = path.join(workerDir, 'heavyspace.cjs')
  } else {
    simWorker = path.join(workerDir, 'simspace.fork.ts')
    heavyWorker = path.join(workerDir, 'heavyspace.fork.ts')
  }

  heavyProc = fork(heavyWorker, [], {
    env: workerEnv,
    execArgv: isBundled ? [] : ['--import', 'tsx'],
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  })

  simProc = fork(simWorker, [], {
    env: workerEnv,
    execArgv: isBundled ? [] : ['--import', 'tsx'],
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  })

  heavyProc.stderr?.on('data', (d) => process.stderr.write(`[heavy] ${d}`))
  simProc.stderr?.on('data', (d) => process.stderr.write(`[sim] ${d}`))

  heavyProc.on('error', (err) => {
    console.error('heavyProc error:', err)
  })
  simProc.on('error', (err) => {
    console.error('simProc error:', err)
  })
  heavyProc.on('exit', (code) => {
    if (code !== 0) console.error('heavyProc exited with', code)
  })
  simProc.on('exit', (code) => {
    if (code !== 0) console.error('simProc exited with', code)
  })

  heavyProc.on('message', (message: MESSAGE) => {
    if (shouldforwardclienttoserver(message) && simProc) {
      simProc.send(message)
    }
    if (shouldforwardclienttoheavy(message) && heavyProc) {
      heavyProc.send(message)
    }
    forward(message)
  })

  simProc.on('message', (message: MESSAGE) => {
    if (shouldforwardclienttoserver(message) && simProc) {
      simProc.send(message)
    }
    if (shouldforwardclienttoheavy(message) && heavyProc) {
      heavyProc.send(message)
    }
    forward(message)
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
