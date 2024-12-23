import { createRoot, events, Canvas } from '@react-three/fiber'
import debounce from 'debounce'
import { Intersection, Plane, Vector3 } from 'three'
import { makeeven } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'

import { App } from './app'

const target = new Vector3()
const facing = new Vector3()

const eventManagerFactory: Parameters<typeof Canvas>[0]['events'] = (
  state,
) => ({
  // Default configuration
  ...events(state),

  // The filter can re-order or re-structure the intersections
  filter: (items: Intersection[]) => {
    const list = items.filter((item) => {
      if (!item.object.visible) {
        return false
      }

      const clippingPlanes: Plane[] = item.object.userData.clippingPlanes ?? []
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

  const config = {
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
  }

  // Configure the root, inject events optionally, set camera, etc
  root.configure({
    ...config,
    events: eventManagerFactory,
    onCreated({ gl }) {
      gl.localClippingEnabled = true
    },
  })

  const handleresize = debounce((width: number, height: number) => {
    root.configure({
      ...config,
      events: eventManagerFactory,
      size: { width, height, top: 0, left: 0 },
      onCreated({ gl }) {
        gl.localClippingEnabled = true
      },
    })
  }, 256)

  window.addEventListener('resize', () => {
    handleresize(makeeven(window.innerWidth), makeeven(window.innerHeight))
  })

  // Render entry point
  root.render(<App />)
}
