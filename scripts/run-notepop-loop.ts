/**
 * Watch zss_daisy_synth.cpp and rerun build → render A/B → gates on save.
 *
 * Usage:
 *   yarn loop:notepop
 *   yarn loop:notepop --skip-build
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const CPPSRC = path.join(
  PROJECT,
  'zss/feature/synth/backend/daisy/native/zss_daisy_synth.cpp',
)

const POLL_MS = 2000
const DEBOUNCE_MS = 1000
const skipbuild = process.argv.includes('--skip-build')

function runfull(): boolean {
  try {
    if (skipbuild) {
      execSync('yarn render:notepop:ab && yarn test:notepop', {
        cwd: PROJECT,
        stdio: 'inherit',
      })
    } else {
      execSync('yarn test:notepop:full', {
        cwd: PROJECT,
        stdio: 'inherit',
      })
    }
    return true
  } catch {
    return false
  }
}

async function main() {
  let lastmtime = fs.statSync(CPPSRC).mtimeMs
  let pending: ReturnType<typeof setTimeout> | undefined

  console.log(`Watching ${CPPSRC}`)
  console.log(
    skipbuild
      ? 'Pipeline: render:notepop:ab → test:notepop'
      : 'Pipeline: test:notepop:full',
  )

  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    const mtime = fs.statSync(CPPSRC).mtimeMs
    if (mtime === lastmtime) {
      continue
    }
    lastmtime = mtime
    if (pending) {
      clearTimeout(pending)
    }
    pending = setTimeout(() => {
      console.log('\n▶ zss_daisy_synth.cpp changed — running pipeline…')
      const pass = runfull()
      if (pass) {
        console.log('NOTEPOP_LOOP_PASS')
      } else {
        console.log('NOTEPOP_LOOP_FAIL')
      }
    }, DEBOUNCE_MS)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
