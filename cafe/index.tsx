import { createRoot, events, Canvas } from '@react-three/fiber'
import debounce from 'debounce'
import { Intersection, Plane, Vector3 } from 'three'
import { makeeven } from 'zss/mapping/number'
import { deepcopy, ispresent } from 'zss/mapping/types'

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
          facing.subVectors(item.point, target).normalize()
          // .round()
          const isfacing = plane.normal.equals(facing)
          console.info('f', facing.x, facing.y)
          console.info('n', plane.normal.x, plane.normal.y)
          return isfacing === false
        })
      ) {
        return false
        // console.info(clippingPlanes)
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
  const applyconfig = (maybewidth: number, maybeheight: number) => {
    const width = makeeven(maybewidth)
    const height = makeeven(maybeheight)
    root.configure({
      ...deepcopy({
        flat: true,
        linear: true,
        shadows: false,
        gl: {
          alpha: false,
          stencil: false,
          antialias: false,
          powerPreference: 'low-power',
          preserveDrawingBuffer: true,
        },
      }),
      events: eventManagerFactory,
      size: { width, height, top: 0, left: 0 },
      onCreated({ gl }) {
        gl.localClippingEnabled = true
      },
    })
  }

  const handleresize = debounce(applyconfig, 256)

  window.addEventListener('resize', () => {
    handleresize(window.innerWidth, window.innerHeight)
  })

  // init
  applyconfig(window.innerWidth, window.innerHeight)

  // Render entry point
  root.render(<App />)
}
