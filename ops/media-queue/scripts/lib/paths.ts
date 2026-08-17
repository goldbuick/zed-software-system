/**
 * Shared path lookups for media-queue build scripts.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const MQ_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

export function binpath(name: string) {
  return path.join(
    MQ_ROOT,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? `${name}.cmd` : name,
  )
}
