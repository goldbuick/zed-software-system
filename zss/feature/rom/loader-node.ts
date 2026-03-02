/**
 * Node-only ROM loader. Uses fs/path/url to walk the editor directory.
 * Only loaded via dynamic import when import.meta.glob is unavailable (server mode).
 */
import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

export function loadRomFiles(): Record<string, string> {
  const content: Record<string, string> = {}
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    function walk(dir: string, base = '') {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full, base ? `${base}/${entry.name}` : entry.name)
        } else if (entry.name.endsWith('.txt')) {
          const p = (base ? `${base}/` : '') + entry.name.replace('.txt', '')
          content[p.replaceAll('/', ':')] = readFileSync(full, 'utf-8')
        }
      }
    }
    walk(__dirname)
  } catch {
    // no rom files in Node
  }
  return content
}
