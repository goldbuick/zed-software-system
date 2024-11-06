import { extend, createRoot, events, Canvas } from '@react-three/fiber'
import debounce from 'debounce'
import * as THREE from 'three'
import { makeEven } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'

import { App } from './app'

extend(THREE)

const target = new THREE.Vector3()
const facing = new THREE.Vector3()

const eventManagerFactory: Parameters<typeof Canvas>[0]['events'] = (
  state,
) => ({
  // Default configuration
  ...events(state),

  // The filter can re-order or re-structure the intersections
  filter: (items: THREE.Intersection[]) => {
    const list = items.filter((item) => {
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

    const blockingIndex = list.findIndex(
      (item) => item.object.userData.blocking,
    )

    const result =
      blockingIndex === -1 ? list : list.slice(0, blockingIndex + 1)

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
  },
})

// Create a react root
const engine = document.querySelector('canvas')
if (ispresent(engine)) {
  const root = createRoot(engine)

  // Configure the root, inject events optionally, set camera, etc
  root.configure({
    events: eventManagerFactory,
    dpr: 1,
    flat: true,
    linear: true,
    shadows: false,
    gl: {
      alpha: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: true,
    },
    onCreated({ gl }) {
      gl.localClippingEnabled = true
    },
  })

  const handleresize = debounce((width: number, height: number) => {
    root.configure({
      size: { width, height, top: 0, left: 0 },
    })
  }, 256)

  window.addEventListener('resize', () => {
    handleresize(makeEven(window.innerWidth), makeEven(window.innerHeight))
  })

  // Render entry point
  root.render(<App />)
}
