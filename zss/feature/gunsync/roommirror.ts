/** Ephemeral in-memory Gun graph per worker (`peers` empty → hub adapter supplies mesh.transport). */
/** Browser `gun` entry is core-only; `lib/wire.js` does not run, so `opt.mesh` must be created with `Gun.Mesh` (src/mesh). */
import Gun from 'gun'
// @ts-expect-error gun/src/mesh is CJS without package typings
import GunMesh from 'gun/src/mesh.js'

import {
  type Gunrootatom,
  gunoptnormalizepeers,
} from '../../memory/gunoptpeers'

type Gunmesh = {
  hi: (peer: unknown) => void
  bye: (peer: unknown) => void
  hear: (raw: string | object, peer: unknown) => void
}

export const roomgun = Gun({
  peers: [],
  radisk: false,
  multicast: false,
  axe: false,
})

const atom = roomgun._ as unknown as Gunrootatom
const root = atom.root ?? atom
gunoptnormalizepeers(atom)
const existingmesh = atom.opt.mesh as Gunmesh | undefined
if (
  !(
    existingmesh &&
    typeof existingmesh.hear === 'function' &&
    typeof existingmesh.hi === 'function'
  )
) {
  atom.opt.mesh = GunMesh(root) as Gunmesh
}
