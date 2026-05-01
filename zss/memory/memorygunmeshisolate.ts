/**
 * MEMORY Gun: full DAM mesh (`say` / dedup) but no neighbor transport —
 * drop inbound frames and ignore hi/bye so nothing peers or applies remote sync.
 */
// @ts-expect-error gun/src/mesh is CJS without package typings
import GunMesh from 'gun/src/mesh.js'

import { gunoptnormalizepeers, type Gunrootatom } from './gunoptpeers'

type Gunmesh = {
  hi: (peer: unknown) => void
  bye: (peer: unknown) => void
  hear: (raw: string | object, peer: unknown) => void
  say: (msg: unknown, peer?: unknown) => unknown
}

export function memorygunattachisolatedmesh(gun: { _: unknown }): void {
  const atom = gun._ as Gunrootatom
  const root = atom.root ?? atom
  gunoptnormalizepeers(atom)

  const mesh = GunMesh(root) as Gunmesh
  const saysave = mesh.say.bind(mesh)
  atom.opt.mesh = mesh

  mesh.hear = function memorygunhearnoop() {}
  mesh.hi = function memorygunhinoop() {}
  mesh.bye = function memorygunbyenoop() {}
  mesh.say = saysave
}
