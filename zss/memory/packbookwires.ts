/**
 * Remap + trim + msgpack + zstd for already-exported book wires.
 * Shared by compressspace worker and Jest / in-process fallback.
 */
import { pack } from 'msgpackr'
import { FORMAT_OBJECT } from 'zss/feature/format'

import { bookzstdcompressbase64url } from './bookzstd'
import { applyexportidremap, buildexportidremap } from './exportidremap'
import { trimformatobject } from './trimexport'

/**
 * Pack exported FORMAT_OBJECT wires into the URL save string.
 * Mutates wires in place via applyexportidremap (same as prior compress path).
 */
export async function packbookwirestourl(
  main: string | undefined,
  wires: FORMAT_OBJECT[],
  protectedids: ReadonlySet<string> | readonly string[],
): Promise<string> {
  const protect =
    protectedids instanceof Set ? protectedids : new Set<string>(protectedids)
  const exported: FORMAT_OBJECT[] = []
  for (let i = 0; i < wires.length; ++i) {
    applyexportidremap(wires[i], buildexportidremap(wires[i], protect))
    const trimmed = trimformatobject(wires[i])
    if (trimmed) {
      exported.push(trimmed)
    }
  }
  const bin = pack({ main, books: exported })
  const bytes = bin instanceof Uint8Array ? bin : new Uint8Array(bin)
  return bookzstdcompressbase64url(bytes)
}
