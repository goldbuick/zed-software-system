/**
 * Shared Gun `opt.peers` normalization (plain object map, never array).
 * Browser core-only and Node mesh paths expect this shape.
 */

export type Gunrootatom = {
  root?: Gunrootatom
  opt: { peers?: unknown; mesh?: unknown }
  dup: unknown
  on: unknown
}

export function gunoptnormalizepeers(atom: Gunrootatom): void {
  if (!atom.opt) {
    atom.opt = { peers: {} }
  }
  if (
    atom.opt.peers === undefined ||
    Array.isArray(atom.opt.peers) ||
    typeof atom.opt.peers !== 'object'
  ) {
    atom.opt.peers = {}
  }
}
