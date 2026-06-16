import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const CATALOGS = [
  'zss/device/EXPORTED_FUNCTIONS.md',
  'zss/gadget/EXPORTED_FUNCTIONS.md',
  'zss/memory/EXPORTED_FUNCTIONS.md',
  'zss/firmware/EXPORTED_FUNCTIONS.md',
  'zss/feature/EXPORTED_FUNCTIONS.md',
  'zss/feature/lang/EXPORTED_FUNCTIONS.md',
  'zss/mapping/EXPORTED_FUNCTIONS.md',
  'zss/screens/EXPORTED_FUNCTIONS.md',
  'zss/words/EXPORTED_FUNCTIONS.md',
]

function listexports(dir) {
  const names = new Set()
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') {
        continue
      }
      for (const name of listexports(full)) {
        names.add(name)
      }
      continue
    }
    if (!/\.tsx?$/.test(entry)) {
      continue
    }
    const text = readFileSync(full, 'utf8')
    for (const match of text.matchAll(/^export (?:async )?function ([a-z][a-z0-9]*)/gm)) {
      names.add(match[1])
    }
    for (const match of text.matchAll(/^export const ([A-Z_][A-Z0-9_]*) =/gm)) {
      names.add(match[1])
    }
  }
  return names
}

function catalogdir(catalogpath) {
  return path.dirname(path.join(ROOT, catalogpath))
}

let exitcode = 0
for (const catalogpath of CATALOGS) {
  const dir = catalogdir(catalogpath)
  const exports = listexports(dir)
  const catalog = readFileSync(path.join(ROOT, catalogpath), 'utf8')
  const missing = [...exports].filter((name) => !catalog.includes(name)).sort()
  const stale = []
  for (const match of catalog.matchAll(/`([a-z][a-z0-9]*|[A-Z_][A-Z0-9_]*)`/g)) {
    const name = match[1]
    if (!exports.has(name) && !catalog.includes(`(${name})`)) {
      stale.push(name)
    }
  }
  const uniquestale = [...new Set(stale)].sort()
  console.log(`\n## ${catalogpath}`)
  if (missing.length) {
    exitcode = 1
    console.log(`missing from catalog (${missing.length}): ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '…' : ''}`)
  } else {
    console.log('missing from catalog: none')
  }
  if (uniquestale.length) {
    console.log(`possibly stale in catalog (${uniquestale.length}): ${uniquestale.slice(0, 20).join(', ')}${uniquestale.length > 20 ? '…' : ''}`)
  } else {
    console.log('possibly stale in catalog: none')
  }
}

process.exit(exitcode)
