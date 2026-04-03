import type { Intersection, Mesh, Object3D, Raycaster, Scene } from 'three'
import { Mesh as MeshImpl, Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import {
  FPV_INSPECT_INSTANCE,
  FPV_INSPECT_TILEMAP,
} from 'zss/gadget/graphics/fpvinspectpick'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'

const localpoint = new Vector3()

function findscene(o: Object3D): Scene | null {
  let r: Object3D = o
  while (r.parent) {
    r = r.parent
  }
  return r.type === 'Scene' ? (r as Scene) : null
}

function gatherfpvpickables(scene: Scene): Object3D[] {
  const out: Object3D[] = []
  scene.traverse((obj) => {
    const kind = obj.userData?.inspectpickkind
    if (kind === FPV_INSPECT_TILEMAP || kind === FPV_INSPECT_INSTANCE) {
      out.push(obj)
    }
  })
  return out
}

export function resolvefpvtilefromhit(
  hit: Intersection,
  pickw: number,
  pickh: number,
): { x: number; y: number } | undefined {
  const obj = hit.object
  const kind = obj.userData?.inspectpickkind
  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()

  if (kind === FPV_INSPECT_TILEMAP) {
    obj.worldToLocal(localpoint.copy(hit.point))
    const px = Math.floor(localpoint.x / cw)
    const py = Math.floor(localpoint.y / ch)
    return {
      x: clamp(px, 0, pickw - 1),
      y: clamp(py, 0, pickh - 1),
    }
  }

  if (kind === FPV_INSPECT_INSTANCE) {
    const id = hit.instanceId
    if (!ispresent(id)) {
      return undefined
    }
    const tx = obj.userData.inspectpicktx
    const ty = obj.userData.inspectpickty
    if (
      tx instanceof Float32Array &&
      ty instanceof Float32Array &&
      id >= 0 &&
      id < tx.length
    ) {
      return {
        x: clamp(Math.round(tx[id]), 0, pickw - 1),
        y: clamp(Math.round(ty[id]), 0, pickh - 1),
      }
    }
  }

  return undefined
}

/**
 * FPV: prefer depth-sorted hits on tagged tile/billboard/pillar meshes; fall back to the
 * mesh's own geometry raycast so pointermove still fires over the board (last-valid coords).
 */
export function attachfpvpickraycast(pickmesh: Mesh) {
  if (pickmesh.userData.fpvpickattached) {
    return
  }
  const baseraycast = MeshImpl.prototype.raycast.bind(pickmesh)
  pickmesh.userData.fpvpickorigraycast = baseraycast
  pickmesh.userData.fpvpickattached = true

  pickmesh.raycast = (raycaster: Raycaster, intersects: Intersection[]) => {
    pickmesh.userData.fpvtile = undefined
    const pickw = pickmesh.userData.fpvpickw as number
    const pickh = pickmesh.userData.fpvpickh as number
    if (!ispresent(pickw) || !ispresent(pickh)) {
      baseraycast(raycaster, intersects)
      return
    }
    const scene = findscene(pickmesh)
    if (!scene) {
      baseraycast(raycaster, intersects)
      return
    }
    const pickables = gatherfpvpickables(scene)
    if (pickables.length === 0) {
      baseraycast(raycaster, intersects)
      return
    }
    const hits = raycaster.intersectObjects(pickables, false)
    hits.sort((a, b) => a.distance - b.distance)
    for (let i = 0; i < hits.length; ++i) {
      const pt = resolvefpvtilefromhit(hits[i], pickw, pickh)
      if (pt) {
        pickmesh.userData.fpvtile = pt
        intersects.push({
          distance: hits[i].distance,
          point: hits[i].point.clone(),
          object: pickmesh,
        })
        return
      }
    }
    baseraycast(raycaster, intersects)
    const selfhit = intersects.find((h) => h.object === pickmesh)
    if (selfhit) {
      pickmesh.userData.fpvtile = undefined
    }
  }
}

export function syncfpvpickdimensions(
  pickmesh: Mesh,
  pickw: number,
  pickh: number,
) {
  pickmesh.userData.fpvpickw = pickw
  pickmesh.userData.fpvpickh = pickh
}

export function detachfpvpickraycast(pickmesh: Mesh) {
  const baseraycast = pickmesh.userData.fpvpickorigraycast
  if (typeof baseraycast === 'function') {
    pickmesh.raycast = baseraycast
  }
  delete pickmesh.userData.fpvpickorigraycast
  delete pickmesh.userData.fpvpickattached
  delete pickmesh.userData.fpvtile
  delete pickmesh.userData.fpvpickw
  delete pickmesh.userData.fpvpickh
}
