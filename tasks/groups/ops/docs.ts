import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { def, handler } from '../../helpers'
import type { TaskContext, TaskDef } from '../../types'

const LINKRE = /!?\[[^\]]*\]\(((?:[^()]|\([^()]*\))+)\)/g
const SKIPSCHEMES = /^(https?:|mailto:|ftp:|tel:|data:|#)/i
const CONTENTROOT = 'docs-site/content'

function withinrepo(root: string, target: string): boolean {
  return target === root || target.startsWith(`${root}/`)
}

function isroutegroup(name: string): boolean {
  return name.startsWith('(') && name.endsWith(')')
}

function isfile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile()
}

/**
 * Parenthesized content folders are Blume route groups. They do not appear
 * in the public URL, including a group between two public segments:
 * /features/boards is content/(lookup)/features/(world)/boards.md.
 */
function sitopathexists(dir: string, segments: string[]): boolean {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return false
  }
  if (segments.length === 0) {
    return false
  }
  const head = segments[0]
  const rest = segments.slice(1)
  const direct = join(dir, head)
  if (rest.length === 0) {
    if (
      isfile(direct) ||
      isfile(`${direct}.md`) ||
      isfile(`${direct}.mdx`) ||
      isfile(join(direct, 'index.md')) ||
      isfile(join(direct, 'index.mdx'))
    ) {
      return true
    }
  } else if (
    existsSync(direct) &&
    statSync(direct).isDirectory() &&
    sitopathexists(direct, rest)
  ) {
    return true
  }
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return false
  }
  for (const entry of entries) {
    if (entry.isDirectory() && isroutegroup(entry.name)) {
      if (sitopathexists(join(dir, entry.name), segments)) {
        return true
      }
    }
  }
  return false
}

function checkrelative(
  root: string,
  fromfile: string,
  rawlink: string,
): boolean {
  const link = rawlink.trim().split('#')[0].split('?')[0]
  if (!link) {
    return true
  }

  if (link.startsWith('/')) {
    const segments = link.replace(/^\//, '').split('/').filter(Boolean)
    if (sitopathexists(join(root, CONTENTROOT), segments)) {
      return true
    }
    console.error(`  [✖] ${fromfile}: ${rawlink} → missing`)
    return false
  }

  const base = dirname(join(root, fromfile))
  let target: string
  try {
    target = join(base, decodeURIComponent(link))
  } catch {
    console.error(`  [✖] ${fromfile}: ${rawlink} (invalid path)`)
    return false
  }
  if (withinrepo(root, target) && existsSync(target)) {
    return true
  }
  // Repo-root paths (docs-placement): ops/fixtures/… from any markdown file.
  const fromroot = join(root, decodeURIComponent(link))
  if (withinrepo(root, fromroot) && existsSync(fromroot)) {
    return true
  }
  if (!withinrepo(root, target) && !withinrepo(root, fromroot)) {
    console.error(`  [✖] ${fromfile}: ${rawlink} (escapes repo)`)
    return false
  }
  console.error(`  [✖] ${fromfile}: ${rawlink} → missing`)
  return false
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
    LINKRE.lastIndex = 0
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
      const output = `${String(err.stdout ?? '')}${String(err.stderr ?? '')}`
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

export const OPS_DOCS_TASKS: TaskDef[] = [
  def('ops:docs:check-links', {
    description: 'Check relative links in tracked markdown files',
    tags: ['ci'],
    run: handler(rundoclinks),
  }),
]
