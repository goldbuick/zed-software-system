import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { WANIX_FIXTURES_DIR } from 'ops/lib/fixturepaths'

/** Absolute path to the local WSS 9P fixture package. */
export const WANIX_P9SERVER_DIR = path.join(WANIX_FIXTURES_DIR, 'p9server')

/** Default empty root when the task is run with no dir arg. */
export const WANIX_P9SERVER_DEFAULT_DIR = path.join(
  WANIX_P9SERVER_DIR,
  'serve-root',
)

/**
 * First non-flag positional arg as the directory to serve.
 * Returns undefined when none given.
 */
export function readwanixp9serverdir(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i]
    if (arg === '--') {
      continue
    }
    if (arg.startsWith('-')) {
      // skip flag and its value when shaped like `-dir <path>`
      if (arg === '-dir' || arg === '--dir') {
        i += 1
      }
      continue
    }
    return arg
  }
  return undefined
}

/**
 * Resolve serve directory: argv path, or default empty fixture root (created).
 */
export function resolvewanixp9serverdir(argv: string[]): string {
  const fromargv = readwanixp9serverdir(argv)
  const dir = fromargv
    ? path.resolve(fromargv)
    : WANIX_P9SERVER_DEFAULT_DIR
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Cafe HTTPS uses vite-plugin-mkcert; browser pages need wss:// for remote import.
 * Returns cert/key paths when `~/.vite-plugin-mkcert/{cert.pem,dev.pem}` exist.
 */
export function resolvewanixp9servertls():
  | { cert: string; key: string }
  | undefined {
  const mk = path.join(os.homedir(), '.vite-plugin-mkcert')
  const cert = path.join(mk, 'cert.pem')
  const key = path.join(mk, 'dev.pem')
  if (existsSync(cert) && existsSync(key)) {
    return { cert, key }
  }
  return undefined
}

/**
 * Long-running: `go run ./p9server/cmd -dir <dir>` from wanix fixtures.
 * Defaults to TLS (wss://) via cafe mkcert certs.
 * Opens the sync folder in Finder (macOS) / file manager, prints connect hints;
 * exits with go's status (Ctrl+C stops the server).
 */
export function runwanixp9server(dir: string, env?: NodeJS.ProcessEnv): number {
  openwanixp9serverfolder(dir)
  const tls = resolvewanixp9servertls()
  process.stdout.write(
    [
      `p9server serving ${dir}`,
      tls
        ? `  TLS: ${tls.cert}`
        : `  ERROR: no ~/.vite-plugin-mkcert — run cafe:dev once (or pass -cert/-key to the Go cmd)`,
      `  #wanix remote connect <printed-wss-url> remote`,
      `  #wanix zedsync remote`,
      '',
    ].join('\n'),
  )
  const result = spawnSync(
    'go',
    ['run', './p9server/cmd', '-dir', dir],
    {
      cwd: WANIX_FIXTURES_DIR,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    },
  )
  if (result.error) {
    throw result.error
  }
  return result.status ?? 1
}

/** Reveal the sync directory in Finder (macOS), explorer (Windows), or xdg-open. */
export function openwanixp9serverfolder(dir: string): void {
  const platform = process.platform
  if (platform === 'darwin') {
    spawnSync('open', [dir], { stdio: 'ignore' })
    return
  }
  if (platform === 'win32') {
    spawnSync('explorer', [dir], { stdio: 'ignore' })
    return
  }
  spawnSync('xdg-open', [dir], { stdio: 'ignore' })
}
