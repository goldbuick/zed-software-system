import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const files = execSync('git ls-files "*.md"', { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)

const linkre = /!?\[[^\]]*\]\(([^)]+)\)/g
const skipschemes = /^(https?:|mailto:|ftp:|tel:|data:|#)/i

let failed = 0

function checkrelative(fromfile, rawlink) {
  const link = rawlink.trim().split('#')[0].split('?')[0]
  if (!link) {
    return true
  }
  const base = dirname(join(root, fromfile))
  let target
  try {
    target = resolve(base, decodeURIComponent(link))
  } catch {
    console.error(`  [✖] ${fromfile}: ${rawlink} (invalid path)`)
    return false
  }
  if (!target.startsWith(root)) {
    console.error(`  [✖] ${fromfile}: ${rawlink} (escapes repo)`)
    return false
  }
  if (!existsSync(target)) {
    console.error(`  [✖] ${fromfile}: ${rawlink} → missing`)
    return false
  }
  return true
}

for (const file of files) {
  const content = readFileSync(join(root, file), 'utf8')
  let match
  while ((match = linkre.exec(content)) !== null) {
    const href = match[1].trim()
    if (skipschemes.test(href)) {
      continue
    }
    if (!checkrelative(file, href)) {
      failed += 1
    }
  }
}

for (const file of files) {
  if (file.startsWith('zss/rom/')) {
    continue
  }
  try {
    execSync(
      `./node_modules/.bin/markdown-link-check -q -c .markdown-link-check.json "${file}"`,
      { cwd: root, stdio: 'pipe' },
    )
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`
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
  process.exit(1)
}

console.log(`Checked ${files.length} markdown files`)
