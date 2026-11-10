import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

import { def, handler } from '../../helpers'
import type { TaskContext, TaskDef } from '../../types'

const DAISY_DIR = 'zss/feature/synth/backend/daisy/native/zss'
const DAISY_WRAPPER =
  'zss/feature/synth/backend/daisy/native/zss_daisy_synth.cpp'
const IGNORE_FILE = '.clang-format-ignore'

function loadignore(root: string): string[] {
  const ignorepath = path.join(root, IGNORE_FILE)
  if (!existsSync(ignorepath)) {
    return []
  }
  const patterns: string[] = []
  for (const line of readFileSync(ignorepath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    patterns.push(trimmed)
  }
  return patterns
}

function matchesignore(
  root: string,
  filepath: string,
  patterns: string[],
): boolean {
  const relpath = filepath.startsWith(`${root}/`)
    ? filepath.slice(root.length + 1)
    : filepath
  for (const pattern of patterns) {
    const segment = pattern.replace(/^\*\*\//, '').split('/')[0]
    if (relpath.includes(`/${segment}/`)) {
      return true
    }
  }
  return false
}

function walkcppdir(dir: string, files: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      walkcppdir(full, files)
      continue
    }
    if (/\.(cpp|h|hpp|cc)$/.test(entry)) {
      files.push(full)
    }
  }
}

function collectcppfiles(root: string, scope: string): string[] {
  const files: string[] = []
  if (scope === 'daisy' || scope === 'all') {
    const daisydir = path.join(root, DAISY_DIR)
    if (existsSync(daisydir)) {
      walkcppdir(daisydir, files)
    }
    const wrapper = path.join(root, DAISY_WRAPPER)
    if (existsSync(wrapper)) {
      files.push(wrapper)
    }
  }
  return [...new Set(files)].sort()
}

const HOMEBREW_CLANG_FORMAT = [
  '/opt/homebrew/opt/llvm/bin/clang-format',
  '/usr/local/opt/llvm/bin/clang-format',
]

function resolveclangformat(envclangformat: string | undefined): string | null {
  const candidates = [
    envclangformat,
    'clang-format',
    ...HOMEBREW_CLANG_FORMAT,
  ].filter((value): value is string => Boolean(value))
  for (const candidate of candidates) {
    if (candidate.includes('/')) {
      if (existsSync(candidate)) {
        return candidate
      }
      continue
    }
    const which = spawnSync('sh', ['-c', `command -v ${candidate}`], {
      encoding: 'utf8',
    })
    if (which.status === 0) {
      return candidate
    }
  }
  return null
}

export function runclangformat(
  ctx: TaskContext,
  mode: 'check' | 'fix',
  scope: string,
): number {
  if (mode !== 'check' && mode !== 'fix') {
    console.error('usage: check|fix [daisy|all]')
    return 2
  }
  if (scope !== 'daisy' && scope !== 'all') {
    console.error('usage: check|fix [daisy|all]')
    return 2
  }

  const clangformat = resolveclangformat(ctx.env.CLANG_FORMAT)
  if (!clangformat) {
    console.error('clang-format not found')
    console.error(
      'install LLVM clang-format 18+ (e.g. brew install llvm, apt install clang-format-18)',
    )
    console.error(
      'or set CLANG_FORMAT to the binary (macOS Homebrew: /opt/homebrew/opt/llvm/bin/clang-format)',
    )
    return 2
  }

  const patterns = loadignore(ctx.root)
  const files = collectcppfiles(ctx.root, scope).filter(
    (file) => !matchesignore(ctx.root, file, patterns),
  )

  if (files.length === 0) {
    console.error(`no C++ files found for scope: ${scope}`)
    return 2
  }

  let failed = 0
  for (const file of files) {
    if (mode === 'check') {
      const result = spawnSync(clangformat, ['--dry-run', '--Werror', file], {
        stdio: 'pipe',
      })
      if (result.status !== 0) {
        console.error(`clang-format check failed: ${file}`)
        failed = 1
      }
    } else {
      const result = spawnSync(clangformat, ['-i', file], { stdio: 'inherit' })
      if (result.status !== 0) {
        failed = 1
      }
    }
  }

  if (failed !== 0) {
    console.error("run 'yarn task run ops:native:lint:fix' to apply formatting")
    return 1
  }

  console.log(`clang-format ${mode} ok (${files.length} files, scope=${scope})`)
  return 0
}

export const OPS_NATIVE_TASKS: TaskDef[] = [
  def('ops:native:lint', {
    description: 'clang-format check on first-party C++ (all targets)',
    tags: ['ci'],
    run: handler((ctx) => runclangformat(ctx, 'check', 'all')),
  }),
  def('ops:native:lint:fix', {
    description: 'Apply clang-format to first-party C++ (all targets)',
    run: handler((ctx) => runclangformat(ctx, 'fix', 'all')),
  }),
]
