import { OrthographicCamera, Stats, Loader } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

const target = new THREE.Vector3()
const facing = new THREE.Vector3()

function handleFilter(intersects: THREE.Intersection[]) {
  const list = intersects.filter((item) => {
    if (!item.object.visible) {
      return false
    }

    const clippingPlanes: THREE.Plane[] =
      item.object.userData.clippingPlanes ?? []
    if (
      clippingPlanes.some((plane) => {
        plane.projectPoint(item.point, target)
        facing.subVectors(item.point, target).normalize().round()
        return plane.normal.equals(facing) === false
      })
    ) {
      return false
    }

    return true
  })

  const blockingIndex = list.findIndex((item) => item.object.userData.blocking)

  const result = blockingIndex === -1 ? list : list.slice(0, blockingIndex + 1)

  let cursor = 'default'
  result.some((item) => {
    if (item.object.userData.cursor) {
      cursor = item.object.userData.cursor
      return true
    }
    return false
  })

  document.querySelectorAll<HTMLElement>('html, body').forEach((node) => {
    node.style.cursor = cursor
  })

  return result
}

export function App() {
  return (
    <Canvas
      id="sim-display"
      flat
      linear
      dpr={1}
      shadows={false}
      touch-action="none"
      gl={{
        alpha: false,
        stencil: false,
        antialias: false,
        // preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      }}
      style={{
        imageRendering: 'pixelated',
      }}
      raycaster={{ filter: handleFilter }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true
      }}
    >
      <OrthographicCamera
        makeDefault
        near={1}
        far={2000}
        position={[0, 0, 1000]}
        zoom={5}
      />
    </Canvas>
  )
}
