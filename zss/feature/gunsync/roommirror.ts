/** Ephemeral in-memory Gun graph per worker (`peers` empty → hub adapter supplies mesh.transport). */
/** Browser `gun` entry is core-only; `lib/wire.js` does not run, so `opt.mesh` must be created with `Gun.Mesh` (src/mesh). */
import Gun from 'gun'
// @ts-expect-error gun/src/mesh is CJS without package typings
import GunMesh from 'gun/src/mesh.js'

type Gunmesh = {
  hi: (peer: unknown) => void
  bye: (peer: unknown) => void
  hear: (raw: string | object, peer: unknown) => void
}

/** Internal root atom shape used by Gun.Mesh(root). */
type Gunrootatom = {
  root?: Gunrootatom
  opt: { mesh?: Gunmesh; peers?: unknown }
  dup: unknown
  on: unknown
}

export const roomgun = Gun({
  peers: [],
  radisk: false,
  multicast: false,
  axe: false,
})

const atom = roomgun._ as unknown as Gunrootatom
const root = atom.root ?? atom
if (!atom.opt) {
  atom.opt = { peers: {} } as Gunrootatom['opt']
}
if (
  atom.opt.peers === undefined ||
  Array.isArray(atom.opt.peers) ||
  typeof atom.opt.peers !== 'object'
) {
  atom.opt.peers = {}
}
if (
  !(
    atom.opt.mesh &&
    typeof atom.opt.mesh.hear === 'function' &&
    typeof atom.opt.mesh.hi === 'function'
  )
) {
  atom.opt.mesh = GunMesh(root) as Gunmesh
}
