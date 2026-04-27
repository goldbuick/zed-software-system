import type { Intersection, Raycaster } from 'three'

/** Mesh/InstancedMesh raycast that registers no hits (pointer passes through to meshes behind). */
export function noraycastmesh(
  _raycaster: Raycaster,
  _intersects: Intersection[],
): void {}
