/**
 * Node-only ROM loader. Uses fs/path/url to walk the editor directory.
 * Only loaded via dynamic import when import.meta.glob is unavailable (server mode).
 */
import { readFileSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

function walk(content: Record<string, string>, dir: string, base = ''): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(content, full, base ? `${base}/${entry.name}` : entry.name)
    } else if (entry.name.endsWith('.txt')) {
      const p = (base ? `${base}/` : '') + entry.name.replace('.txt', '')
      content[p.replaceAll('/', ':')] = readFileSync(full, 'utf-8')
    }
  }
}

export function loadRomFiles(): Record<string, string> {
  const content: Record<string, string> = {}
  try {
    const dir = dirname(fileURLToPath(import.meta.url))
    walk(content, dir)
  } catch {
    // no rom files in Node
  }
  return content
}
