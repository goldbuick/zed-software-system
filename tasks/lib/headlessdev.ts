/**
 * headless:server:dev — Vite in background, Ink CLI in foreground with a real TTY.
 * concurrently pipes stdin (no raw mode); this keeps process.stdin.isTTY for Ink.
 */
import { type ChildProcess, spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'

import { taskenv } from 'tasks/shellutil'
import type { TaskContext } from 'tasks/types'

const VITE_DEV_PORT = 7777
const VITE_READY_TIMEOUT_MS = 120_000
const VITE_READY_POLL_MS = 250

async function waitforport(port: number, timeoutms: number): Promise<void> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    const open = await new Promise<boolean>((resolve) => {
      const socket = net.connect({ host: '127.0.0.1', port }, () => {
        socket.end()
        resolve(true)
      })
      socket.on('error', () => {
        resolve(false)
      })
    })
    if (open) {
      return
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, VITE_READY_POLL_MS)
    })
  }
  throw new Error(`Vite not ready on port ${port} after ${timeoutms}ms`)
}

function pipeuntil(
  stream: NodeJS.ReadableStream | null,
  prefix: string,
  enabled: () => boolean,
): void {
  if (!stream) {
    return
  }
  let buf = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    if (!enabled()) {
      return
    }
    buf += chunk
    let idx = buf.indexOf('\n')
    while (idx >= 0) {
      process.stderr.write(`${prefix}${buf.slice(0, idx)}\n`)
      buf = buf.slice(idx + 1)
      idx = buf.indexOf('\n')
    }
  })
}

function stopchild(child: ChildProcess | undefined, detached: boolean): void {
  if (!child?.pid) {
    return
  }
  try {
    if (detached) {
      process.kill(-child.pid, 'SIGTERM')
    } else {
      child.kill('SIGTERM')
    }
  } catch {
    try {
      child.kill('SIGKILL')
    } catch {
      // already gone
    }
  }
}

export async function runheadlessserverdev(ctx: TaskContext): Promise<number> {
  const env = taskenv(ctx)
  const vitebin = path.join(ctx.root, 'node_modules', '.bin', 'vite')
  const detached = process.platform !== 'win32'
  let forwardvite = true
  let viteexited = false

  const vite = spawn(
    vitebin,
    ['--host', '0.0.0.0', '--port', String(VITE_DEV_PORT)],
    {
      cwd: ctx.root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached,
    },
  )
  pipeuntil(vite.stdout, '[vite] ', () => forwardvite)
  pipeuntil(vite.stderr, '[vite] ', () => forwardvite)
  vite.on('exit', () => {
    viteexited = true
  })

  const stopvite = () => {
    forwardvite = false
    stopchild(vite, detached)
  }

  const onsignal = () => {
    stopvite()
    process.exit(130)
  }
  process.on('SIGINT', onsignal)
  process.on('SIGTERM', onsignal)

  try {
    await waitforport(VITE_DEV_PORT, VITE_READY_TIMEOUT_MS)
    if (viteexited) {
      process.stderr.write('[vite] exited before ready\n')
      return 1
    }
    // Stop forwarding so Ink owns the terminal; Vite keeps serving.
    forwardvite = false
    process.stderr.write(
      `[vite] ready on http://127.0.0.1:${VITE_DEV_PORT} (logs quiet; Ctrl+C stops both)\n`,
    )

    const headlessbin = path.join(ctx.root, 'bin/dev.js')
    const headless = spawn(headlessbin, ['--dev', ...ctx.args], {
      cwd: ctx.root,
      env,
      stdio: 'inherit',
    })

    const code = await new Promise<number>((resolve) => {
      headless.on('error', (err) => {
        process.stderr.write(`headless spawn failed: ${err.message}\n`)
        resolve(1)
      })
      headless.on('exit', (status, signal) => {
        if (signal) {
          resolve(1)
          return
        }
        resolve(status ?? 1)
      })
    })
    return code
  } finally {
    process.off('SIGINT', onsignal)
    process.off('SIGTERM', onsignal)
    stopvite()
  }
}
