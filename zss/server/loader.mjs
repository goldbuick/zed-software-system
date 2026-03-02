/**
 * Node loader for server:
 * - Resolves zss/* to ./zss/*
 * - Redirects zss/feature/storage to storage-server
 * - Redirects maath/misc to stub
 */
import { pathToFileURL } from 'url'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

function resolveZss(specifier) {
  const sub = specifier.slice(4)
  const base = path.join(root, 'zss', sub)
  if (existsSync(path.join(base, 'index.ts'))) return path.join(base, 'index.ts')
  if (existsSync(path.join(base, 'index.tsx'))) return path.join(base, 'index.tsx')
  for (const ext of ['.ts', '.tsx']) {
    const p = base + ext
    if (existsSync(p)) return p
  }
  return base + '.ts'
}

export async function resolve(specifier, context, nextResolve) {
  let resolvedUrl = specifier
  if (context.parentURL && (specifier.startsWith('./') || specifier.startsWith('../'))) {
    const parentPath = fileURLToPath(context.parentURL)
    const dir = path.dirname(parentPath)
    const full = path.join(dir, specifier)
    for (const ext of ['.ts', '.tsx', '']) {
      const p = full + (ext || '')
      if (ext && existsSync(p)) {
        return nextResolve(pathToFileURL(p).href, context)
      }
      if (!ext && existsSync(p + '.ts')) {
        return nextResolve(pathToFileURL(p + '.ts').href, context)
      }
      if (!ext && existsSync(p + '.tsx')) {
        return nextResolve(pathToFileURL(p + '.tsx').href, context)
      }
    }
  }
  if (specifier === 'zss/feature/storage' || specifier.startsWith('zss/feature/storage')) {
    return nextResolve(
      pathToFileURL(path.join(root, 'zss/feature/storage-server.ts')).href,
      context,
    )
  }
  if (specifier === 'maath/misc') {
    return nextResolve(
      pathToFileURL(path.join(root, 'zss/server/stubs/maath-misc.ts')).href,
      context,
    )
  }
  if (specifier.startsWith('zss/')) {
    const resolved = resolveZss(specifier)
    if (existsSync(resolved)) {
      return nextResolve(pathToFileURL(resolved).href, context)
    }
  }
  if (specifier.startsWith('file:')) {
    const filePath = decodeURIComponent(new URL(specifier).pathname)
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js')) {
      const { statSync } = await import('fs')
      const st = statSync(filePath, { throwIfNoEntry: false })
      if (st?.isDirectory()) {
        const indexPath = path.join(filePath, 'index.ts')
        if (existsSync(indexPath)) {
          return nextResolve(pathToFileURL(indexPath).href, context)
        }
        const indexTsx = path.join(filePath, 'index.tsx')
        if (existsSync(indexTsx)) {
          return nextResolve(pathToFileURL(indexTsx).href, context)
        }
      }
      if (existsSync(filePath + '.ts')) {
        return nextResolve(pathToFileURL(filePath + '.ts').href, context)
      }
      if (existsSync(filePath + '.tsx')) {
        return nextResolve(pathToFileURL(filePath + '.tsx').href, context)
      }
    }
  }
  return nextResolve(specifier, context)
}
