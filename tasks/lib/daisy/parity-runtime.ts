import type { launchparitybrowser } from 'tasks/lib/parity/parity-playwright'
import type { startparityvite, stopparityvite } from 'tasks/lib/parity/parity-vite-server'
import type { withscripttimeout } from 'tasks/lib/parity/parity-timeouts'

export type DaisyParityRuntime = {
  fs: typeof import('node:fs').default
  path: typeof import('node:path').default
  fileURLToPath: typeof import('node:url').fileURLToPath
  readFileSync: typeof import('node:fs').readFileSync
  writeFileSync: typeof import('node:fs').writeFileSync
  execSync: typeof import('node:child_process').execSync
  launchparitybrowser: typeof launchparitybrowser
  parityhosturl: (port: number) => string
  startparityvite: typeof startparityvite
  stopparityvite: typeof stopparityvite
  withscripttimeout: typeof withscripttimeout
  RENDERS_FIXTURES_DIR: string
}

/** Lazy-load parity Playwright / vite deps (keeps task registry startup light). */
export async function loaddaisyparityruntime(): Promise<DaisyParityRuntime> {
  const [
    fs,
    path,
    { fileURLToPath },
    { execSync },
    { launchparitybrowser, parityhosturl },
    { startparityvite, stopparityvite },
    { withscripttimeout },
    { RENDERS_FIXTURES_DIR },
  ] = await Promise.all([
    import('node:fs'),
    import('node:path'),
    import('node:url'),
    import('node:child_process'),
    import('tasks/lib/parity/parity-playwright.ts'),
    import('tasks/lib/parity/parity-vite-server.ts'),
    import('tasks/lib/parity/parity-timeouts.ts'),
    import('ops/lib/fixturepaths'),
  ])
  return {
    fs: fs.default,
    path: path.default,
    fileURLToPath,
    readFileSync: fs.readFileSync,
    writeFileSync: fs.writeFileSync,
    execSync,
    launchparitybrowser,
    parityhosturl,
    startparityvite,
    stopparityvite,
    withscripttimeout,
    RENDERS_FIXTURES_DIR,
  }
}
