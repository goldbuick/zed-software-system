import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { def, handler } from '../helpers'
import type { TaskContext, TaskDef } from '../types'

const LINKRE = /!?\[[^\]]*\]\(([^)]+)\)/g
const SKIPSCHEMES = /^(https?:|mailto:|ftp:|tel:|data:|#)/i

function checkrelative(
  root: string,
  fromfile: string,
  rawlink: string,
): boolean {
  const link = rawlink.trim().split('#')[0].split('?')[0]
  if (!link) {
    return true
  }
  const base = dirname(join(root, fromfile))
  let target: string
  try {
    target = join(base, decodeURIComponent(link))
    if (!target.startsWith(root)) {
      console.error(`  [✖] ${fromfile}: ${rawlink} (escapes repo)`)
      return false
    }
  } catch {
    console.error(`  [✖] ${fromfile}: ${rawlink} (invalid path)`)
    return false
  }
  if (!existsSync(target)) {
    console.error(`  [✖] ${fromfile}: ${rawlink} → missing`)
    return false
  }
  return true
}

function rundoclinks(ctx: TaskContext): number {
  const root = ctx.root
  const files = execSync('git ls-files "*.md"', { cwd: root, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)

  let failed = 0

  for (const file of files) {
    const fullpath = join(root, file)
    if (!existsSync(fullpath)) {
      continue
    }
    const content = readFileSync(fullpath, 'utf8')
    let match: RegExpExecArray | null
    while ((match = LINKRE.exec(content)) !== null) {
      const href = match[1].trim()
      if (SKIPSCHEMES.test(href)) {
        continue
      }
      if (!checkrelative(root, file, href)) {
        failed += 1
      }
    }
  }

  for (const file of files) {
    if (file.startsWith('zss/rom/')) {
      continue
    }
    const fullpath = join(root, file)
    if (!existsSync(fullpath)) {
      continue
    }
    try {
      execSync(
        `./node_modules/.bin/markdown-link-check -q -c ops/docs/markdown-link-check.json "${file}"`,
        { cwd: root, stdio: 'pipe' },
      )
    } catch (error: unknown) {
      const err = error as { stdout?: Buffer; stderr?: Buffer }
      const output = `${err.stdout ?? ''}${err.stderr ?? ''}`
      const lines = output.split('\n').filter((line) => line.includes('[✖]'))
      if (lines.length) {
        console.log(`FILE: ${file}`)
        for (const line of lines) {
          console.log(`  ${line.trim()}`)
        }
        failed += lines.length
      }
    }
  }

  if (failed) {
    console.error(`\n${failed} broken link(s)`)
    return 1
  }

  console.log(`Checked ${files.length} markdown files`)
  return 0
}

export const DOCS_TASKS: TaskDef[] = [
  def('docs:check-links', {
    description: 'Check relative links in tracked markdown files',
    tags: ['ci'],
    run: handler(rundoclinks),
  }),
]
